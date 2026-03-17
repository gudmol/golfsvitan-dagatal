(function () {
  let refreshTimer = null;
  let currentDate = null;

  // Icelandic day and month names
  const DAY_NAMES = [
    'Sunnudagur', 'Mánudagur', 'Þriðjudagur', 'Miðvikudagur',
    'Fimmtudagur', 'Föstudagur', 'Laugardagur'
  ];
  const MONTH_NAMES = [
    'janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní',
    'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'
  ];

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function minutesToTime(mins) {
    return pad(Math.floor(mins / 60)) + ':' + pad(mins % 60);
  }

  function updateClock() {
    var now = new Date();
    var h = now.getUTCHours();
    var m = now.getUTCMinutes();
    var clockEl = document.getElementById('clock');
    if (clockEl) {
      clockEl.textContent = pad(h) + ':' + pad(m);
    }
  }

  function timeToMinutes(timeStr) {
    var parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  // Shrink font size until text fits within its container
  function fitText(el, maxFontSize, minFontSize) {
    minFontSize = minFontSize || 12;
    el.style.fontSize = maxFontSize + 'px';
    el.style.whiteSpace = 'nowrap';
    el.style.overflow = 'visible';
    var section = el.closest('.now-section') || el.closest('.next-section') || el.closest('.free-slot');
    if (!section) return;
    var style = getComputedStyle(section);
    var padLeft = parseFloat(style.paddingLeft) || 0;
    var padRight = parseFloat(style.paddingRight) || 0;
    var availableWidth = section.clientWidth - padLeft - padRight;
    while (el.scrollWidth > availableWidth && maxFontSize > minFontSize) {
      maxFontSize -= 1;
      el.style.fontSize = maxFontSize + 'px';
    }
  }

  // Merge duplicate time slots: combine customer names for overlapping bookings
  function mergeBookings(bookings) {
    var merged = [];
    bookings.forEach(function (b) {
      var existing = merged.find(function (m) {
        return m.start === b.start && m.end === b.end;
      });
      if (existing) {
        existing.customer += ' & ' + b.customer;
      } else {
        merged.push({ start: b.start, end: b.end, customer: b.customer, service: b.service });
      }
    });
    return merged;
  }

  // Build a timeline of future slots (booked + free gaps)
  function buildSchedule(bookings, fromMinutes, toMinutes) {
    var future = bookings
      .filter(function (b) { return timeToMinutes(b.end) > fromMinutes; })
      .sort(function (a, b) { return timeToMinutes(a.start) - timeToMinutes(b.start); });

    var slots = [];
    var cursor = fromMinutes;

    future.forEach(function (booking) {
      var bStart = timeToMinutes(booking.start);
      var bEnd = timeToMinutes(booking.end);

      if (bStart < cursor) bStart = cursor;

      // Free gap before this booking
      if (bStart > cursor) {
        slots.push({
          type: 'free',
          start: minutesToTime(cursor),
          end: minutesToTime(bStart),
          name: 'Laust'
        });
      }

      if (bEnd > cursor) {
        slots.push({
          type: 'booked',
          start: booking.start,
          end: booking.end,
          name: booking.customer
        });
        cursor = bEnd;
      }
    });

    // Free gap after last booking
    if (cursor < toMinutes) {
      slots.push({
        type: 'free',
        start: minutesToTime(cursor),
        end: minutesToTime(toMinutes),
        name: 'Laust'
      });
    }

    return slots;
  }

  // Determine closing time from bookings (last booking end, not arbitrary 23:00)
  function getClosingTime(data) {
    var latest = 0;
    data.simulators.forEach(function (sim) {
      sim.bookings.forEach(function (b) {
        var end = timeToMinutes(b.end);
        if (end > latest) latest = end;
      });
    });
    return latest;
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    var location = params.get('location');

    if (!location) {
      document.getElementById('location-selector').classList.remove('hidden');
      return;
    }

    document.getElementById('display').classList.remove('hidden');

    updateClock();
    setInterval(updateClock, 10000);

    fetchAndRender(location);

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        refitAllNames();
      }, 200);
    });
  }

  function refitAllNames() {
    var isLarge = window.innerWidth >= 1200;
    var nowMax = isLarge ? 48 : 32;
    var nowMin = isLarge ? 20 : 14;
    var nextMax = isLarge ? 28 : 21;
    var nextMin = isLarge ? 16 : 12;

    document.querySelectorAll('.now-name').forEach(function (el) {
      if (el.textContent !== 'Laus') {
        el.style.fontSize = '';
        fitText(el, nowMax, nowMin);
      }
    });
    document.querySelectorAll('.next-name').forEach(function (el) {
      el.style.fontSize = '';
      fitText(el, nextMax, nextMin);
    });
  }

  async function fetchAndRender(location) {
    try {
      var res = await fetch('/api/bookings?location=' + encodeURIComponent(location));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();

      document.getElementById('error-banner').classList.add('hidden');
      renderDisplay(data);

      if (currentDate && currentDate !== data.date) {
        window.location.reload();
        return;
      }
      currentDate = data.date;

      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(function () {
        fetchAndRender(location);
      }, data.refreshInterval || 180000);
    } catch (err) {
      console.error('Fetch error:', err);
      document.getElementById('error-banner').classList.remove('hidden');
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(function () {
        fetchAndRender(location);
      }, 30000);
    }
  }

  function renderDisplay(data) {
    // Header
    document.getElementById('location-name').textContent = data.location;

    var d = new Date(data.date + 'T12:00:00Z');
    var dayName = DAY_NAMES[d.getUTCDay()];
    var dateStr = dayName + ' ' + d.getUTCDate() + '. ' + MONTH_NAMES[d.getUTCMonth()];
    document.getElementById('date-display').textContent = dateStr;

    var now = new Date();
    var nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

    // Closing time = last booking end across all simulators (not hardcoded 23:00)
    var closingTime = getClosingTime(data);

    var container = document.getElementById('simulators');
    container.innerHTML = '';

    var numSims = data.simulators.length;
    container.style.gridTemplateColumns = 'repeat(' + numSims + ', 1fr)';

    data.simulators.forEach(function (sim) {
      // Merge duplicate bookings (same time slot, multiple customers)
      var bookings = mergeBookings(sim.bookings);

      var card = document.createElement('div');
      card.className = 'sim-card';

      var header = document.createElement('div');
      header.className = 'sim-card-header';
      header.textContent = sim.label;
      card.appendChild(header);

      var body = document.createElement('div');
      body.className = 'sim-card-body';

      // Find current and upcoming bookings
      var currentBookings = [];
      var futureBookings = [];

      bookings.forEach(function (booking) {
        var startMin = timeToMinutes(booking.start);
        var endMin = timeToMinutes(booking.end);

        if (startMin <= nowMinutes && endMin > nowMinutes) {
          currentBookings.push(booking);
        } else if (startMin > nowMinutes) {
          futureBookings.push(booking);
        }
      });

      // Sort future by start time
      futureBookings.sort(function (a, b) {
        return timeToMinutes(a.start) - timeToMinutes(b.start);
      });

      var currentBooking = currentBookings.length > 0 ? currentBookings[0] : null;
      // If multiple bookings at same time, merge names
      if (currentBookings.length > 1) {
        currentBooking = {
          start: currentBookings[0].start,
          end: currentBookings[0].end,
          customer: currentBookings.map(function (b) { return b.customer; }).join(' & ')
        };
      }

      var nextBooking = futureBookings.length > 0 ? futureBookings[0] : null;
      var laterBookings = futureBookings.slice(1);

      // === NOW section ===
      var nowSection = document.createElement('div');
      nowSection.className = 'now-section' + (currentBooking ? '' : ' empty');

      var nowLabel = document.createElement('div');
      nowLabel.className = 'section-label';
      nowLabel.textContent = 'NÚNA';

      var nowName = document.createElement('div');
      nowName.className = 'now-name';

      if (currentBooking) {
        nowName.textContent = currentBooking.customer;
        var nowTime = document.createElement('div');
        nowTime.className = 'now-time';
        nowTime.textContent = currentBooking.start + ' – ' + currentBooking.end;
        nowSection.appendChild(nowLabel);
        nowSection.appendChild(nowName);
        nowSection.appendChild(nowTime);
      } else {
        nowSection.classList.add('free-now');
        nowName.textContent = 'Laus';
        nowSection.appendChild(nowLabel);
        nowSection.appendChild(nowName);

        if (nextBooking) {
          var freeUntil = document.createElement('div');
          freeUntil.className = 'now-time';
          freeUntil.style.color = '#6aaa6a';
          freeUntil.textContent = 'Laust til ' + nextBooking.start;
          nowSection.appendChild(freeUntil);
        } else {
          var freeRest = document.createElement('div');
          freeRest.className = 'now-time';
          freeRest.style.color = '#6aaa6a';
          freeRest.textContent = 'Laust restina af deginum';
          nowSection.appendChild(freeRest);
        }

        // QR code for booking
        var qrWrap = document.createElement('div');
        qrWrap.className = 'qr-section';
        var qrImg = document.createElement('img');
        qrImg.src = 'qr-code.png';
        qrImg.alt = 'Bókaðu tíma';
        qrImg.className = 'qr-code';
        var qrText = document.createElement('div');
        qrText.className = 'qr-text';
        qrText.textContent = 'Bókaðu auka tíma hér';
        qrWrap.appendChild(qrImg);
        qrWrap.appendChild(qrText);
        nowSection.appendChild(qrWrap);
      }

      body.appendChild(nowSection);

      // === Free gap between current and next ===
      if (currentBooking && nextBooking) {
        var currentEnd = timeToMinutes(currentBooking.end);
        var nextStart = timeToMinutes(nextBooking.start);
        if (nextStart > currentEnd) {
          var freeSlot = document.createElement('div');
          freeSlot.className = 'free-slot';

          var freeLabel = document.createElement('div');
          freeLabel.className = 'section-label';
          freeLabel.textContent = 'LAUST';

          var freeText = document.createElement('div');
          freeText.className = 'free-slot-text';
          freeText.textContent = 'Laust';

          var freeTime = document.createElement('div');
          freeTime.className = 'free-slot-time';
          freeTime.textContent = currentBooking.end + ' – ' + nextBooking.start;

          freeSlot.appendChild(freeLabel);
          freeSlot.appendChild(freeText);
          freeSlot.appendChild(freeTime);

          // QR code for free gap
          var gapQr = document.createElement('div');
          gapQr.className = 'qr-section qr-small';
          var gapQrImg = document.createElement('img');
          gapQrImg.src = 'qr-code.png';
          gapQrImg.alt = 'Bókaðu tíma';
          gapQrImg.className = 'qr-code';
          var gapQrText = document.createElement('div');
          gapQrText.className = 'qr-text';
          gapQrText.textContent = 'Bókaðu auka tíma hér';
          gapQr.appendChild(gapQrImg);
          gapQr.appendChild(gapQrText);
          freeSlot.appendChild(gapQr);

          body.appendChild(freeSlot);
        }
      }

      // === "Laust eftir" when booked now but nothing next ===
      if (currentBooking && !nextBooking) {
        var afterSection = document.createElement('div');
        afterSection.className = 'free-slot';

        var afterLabel = document.createElement('div');
        afterLabel.className = 'section-label';
        afterLabel.textContent = 'EFTIR';

        var afterText = document.createElement('div');
        afterText.className = 'free-slot-text';
        afterText.textContent = 'Laust';

        var afterTime = document.createElement('div');
        afterTime.className = 'free-slot-time';
        afterTime.textContent = 'Frá ' + currentBooking.end;

        afterSection.appendChild(afterLabel);
        afterSection.appendChild(afterText);
        afterSection.appendChild(afterTime);

        // QR code for after section
        var afterQr = document.createElement('div');
        afterQr.className = 'qr-section qr-small';
        var afterQrImg = document.createElement('img');
        afterQrImg.src = 'qr-code.png';
        afterQrImg.alt = 'Bókaðu tíma';
        afterQrImg.className = 'qr-code';
        var afterQrText = document.createElement('div');
        afterQrText.className = 'qr-text';
        afterQrText.textContent = 'Bókaðu auka tíma hér';
        afterQr.appendChild(afterQrImg);
        afterQr.appendChild(afterQrText);
        afterSection.appendChild(afterQr);

        body.appendChild(afterSection);
      }

      // === NEXT section ===
      if (nextBooking) {
        var nextSection = document.createElement('div');
        nextSection.className = 'next-section';

        var nextLabel = document.createElement('div');
        nextLabel.className = 'section-label';
        nextLabel.textContent = 'NÆST';

        var nextName = document.createElement('div');
        nextName.className = 'next-name';
        nextName.textContent = nextBooking.customer;

        var nextTime = document.createElement('div');
        nextTime.className = 'next-time';
        nextTime.textContent = nextBooking.start + ' – ' + nextBooking.end;

        nextSection.appendChild(nextLabel);
        nextSection.appendChild(nextName);
        nextSection.appendChild(nextTime);
        body.appendChild(nextSection);
      }

      // === Schedule for rest of day ===
      var scheduleAfterNext = [];
      if (nextBooking) {
        var afterNextStart = timeToMinutes(nextBooking.end);
        scheduleAfterNext = buildSchedule(laterBookings, afterNextStart, closingTime);
      } else if (!currentBooking) {
        scheduleAfterNext = buildSchedule(bookings, nowMinutes, closingTime);
        if (scheduleAfterNext.length > 0 && scheduleAfterNext[0].type === 'free') {
          scheduleAfterNext.shift();
        }
      }

      if (scheduleAfterNext.length > 0) {
        var schedList = document.createElement('div');
        schedList.className = 'schedule-list';

        var schedLabel = document.createElement('div');
        schedLabel.className = 'schedule-label';
        schedLabel.textContent = 'Síðar í dag';
        schedList.appendChild(schedLabel);

        scheduleAfterNext.forEach(function (slot) {
          var item = document.createElement('div');
          item.className = 'schedule-item ' + slot.type;

          var itemTime = document.createElement('span');
          itemTime.className = 'schedule-item-time';
          itemTime.textContent = slot.start + ' – ' + slot.end;

          var itemName = document.createElement('span');
          itemName.className = 'schedule-item-name';
          itemName.textContent = slot.name;

          item.appendChild(itemTime);
          item.appendChild(itemName);

          // Small QR icon for free schedule slots
          if (slot.type === 'free') {
            var schedQr = document.createElement('img');
            schedQr.src = 'qr-code.png';
            schedQr.alt = 'Bóka';
            schedQr.className = 'qr-code-inline';
            item.appendChild(schedQr);
          }

          schedList.appendChild(item);
        });

        body.appendChild(schedList);
      }

      card.appendChild(body);
      container.appendChild(card);
    });

    // Fit names after DOM is updated
    requestAnimationFrame(function () {
      var isLarge = window.innerWidth >= 1200;
      var nowMax = isLarge ? 48 : 32;
      var nowMin = isLarge ? 20 : 16;
      var nextMax = isLarge ? 28 : 21;
      var nextMin = isLarge ? 16 : 14;

      document.querySelectorAll('.now-name').forEach(function (el) {
        if (el.textContent !== 'Laus') fitText(el, nowMax, nowMin);
      });
      document.querySelectorAll('.next-name').forEach(function (el) {
        fitText(el, nextMax, nextMin);
      });
    });
  }

  init();
})();
