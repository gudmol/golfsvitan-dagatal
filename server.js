const express = require('express');
const ical = require('node-ical');
const path = require('path');
const config = require('./config');

const app = express();

// In-memory cache: { [cacheKey]: { data, timestamp } }
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

app.use(express.static(path.join(__dirname, 'public')));

// Format time as HH:MM
function formatTime(date) {
  return date.toISOString().slice(11, 16);
}

// Convert "HH:MM" to minutes since midnight
function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Check if a date is today (UTC)
function isToday(date) {
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

// Extract customer first name from DESCRIPTION field
// Format: "Þjónusta: ... \nNafn Eftirnafn (+354...) email \n"
function extractCustomerName(description) {
  if (!description) return '';
  // Find the line after "Þjónusta:" that contains the customer name
  const lines = description.split(/\\n|\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip the service line and empty lines
    if (!trimmed || trimmed.startsWith('Þjónusta:')) continue;
    // Extract name before phone number or email
    const nameMatch = trimmed.match(/^(.+?)(?:\s*\(|\s+\S+@)/);
    if (nameMatch) {
      const fullName = nameMatch[1].trim();
      // Return first name only
      const parts = fullName.split(/\s+/);
      return parts[0];
    }
    // If no phone/email pattern, return the whole line as name
    return trimmed.split(/\s+/)[0];
  }
  return '';
}

// Fetch and parse iCal feed for a single simulator
async function fetchSimulatorBookings(simulator) {
  if (!simulator.icalUrl) {
    return { id: simulator.id, label: simulator.label, bookings: [] };
  }

  const cacheKey = simulator.id + '_' + simulator.icalUrl;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const events = await ical.async.fromURL(simulator.icalUrl);
    const bookings = [];

    for (const [, event] of Object.entries(events)) {
      if (event.type !== 'VEVENT') continue;
      if (event.status === 'CANCELLED') continue;

      const start = new Date(event.start);
      if (!isToday(start)) continue;

      const customerName = extractCustomerName(event.description);
      bookings.push({
        start: formatTime(start),
        end: event.end ? formatTime(new Date(event.end)) : '',
        customer: customerName || event.summary || 'Bókun',
        service: event.summary || ''
      });
    }

    // Remove cancelled bookings from Bookly iCal feed.
    // Bookly keeps cancelled bookings without STATUS:CANCELLED.
    // A simulator can only have ONE booking at any given moment, so any
    // overlap means one booking is cancelled.
    //
    // Strategy: later entries in the iCal feed are newer (active) bookings.
    // Process bookings from LAST to FIRST. Build a minute-by-minute timeline.
    // If a booking overlaps with already-claimed time, it's the old cancelled
    // booking and should be removed.
    const timeline = new Set(); // minutes already claimed by active bookings
    const kept = [];

    // Process in reverse order (newest/last in feed first)
    for (let i = bookings.length - 1; i >= 0; i--) {
      const b = bookings[i];
      const bStart = timeToMin(b.start);
      const bEnd = timeToMin(b.end);

      // Check if ANY minute of this booking is already claimed
      let hasConflict = false;
      for (let m = bStart; m < bEnd; m++) {
        if (timeline.has(m)) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict) {
        // This booking overlaps with a newer one — it's cancelled, skip it
        continue;
      }

      // Claim all minutes for this booking
      for (let m = bStart; m < bEnd; m++) {
        timeline.add(m);
      }
      kept.push(b);
    }

    const dedupedBookings = kept.reverse(); // restore chronological order

    // Sort by start time
    dedupedBookings.sort((a, b) => a.start.localeCompare(b.start));

    const result = {
      id: simulator.id,
      label: simulator.label,
      bookings: dedupedBookings
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error(`Error fetching iCal for ${simulator.label}:`, err.message);
    // Return cached data if available (even if stale)
    if (cached) return cached.data;
    return { id: simulator.id, label: simulator.label, bookings: [], fetchError: true };
  }
}

// API endpoint
app.get('/api/bookings', async (req, res) => {
  const locationKey = req.query.location;

  if (!locationKey || !config.locations[locationKey]) {
    return res.status(400).json({
      error: 'Invalid location',
      available: Object.keys(config.locations)
    });
  }

  const location = config.locations[locationKey];

  try {
    const simulators = await Promise.all(
      location.simulators.map(sim => fetchSimulatorBookings(sim))
    );

    const now = new Date();
    res.json({
      location: location.name,
      date: now.toISOString().slice(0, 10),
      currentTime: formatTime(now),
      simulators,
      refreshInterval: config.refreshInterval
    });
  } catch (err) {
    console.error('Error fetching bookings:', err.message);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(config.port, () => {
  console.log(`Golfsvítan Dagatal running on http://localhost:${config.port}`);
  console.log('Available locations:', Object.keys(config.locations).join(', '));
});
