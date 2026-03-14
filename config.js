module.exports = {
  port: process.env.PORT || 3001,
  refreshInterval: 3 * 60 * 1000, // 3 minutes

  locations: {
    kopavogur: {
      name: 'Kópavogur - Ögurhvarf',
      simulators: [
        {
          id: 'sim1',
          label: 'Hermir 1',
          icalUrl: 'https://golf.golfsvitan.is/wp-admin/admin-ajax.php?action=bookly_pro_staff_icalendar&token=93da29d696367fa20f9de0368f88fd59'
        },
        {
          id: 'sim2',
          label: 'Hermir 2',
          icalUrl: 'https://golf.golfsvitan.is/wp-admin/admin-ajax.php?action=bookly_pro_staff_icalendar&token=50e5d376fd7a87a54924087a67458d8b'
        },
        {
          id: 'sim3',
          label: 'Hermir 3',
          icalUrl: 'https://golf.golfsvitan.is/wp-admin/admin-ajax.php?action=bookly_pro_staff_icalendar&token=3b739988fc17e1191fa248b680983fd5'
        },
        {
          id: 'sim4',
          label: 'Hermir 4',
          icalUrl: 'https://golf.golfsvitan.is/wp-admin/admin-ajax.php?action=bookly_pro_staff_icalendar&token=3c3e18ca14e0138d34670eb0cec67870'
        }
      ]
    },
    hafnarfjordur: {
      name: 'Hafnarfjörður',
      simulators: [
        {
          id: 'sim1',
          label: 'Hermir 1',
          icalUrl: 'https://golf.golfsvitan.is/wp-admin/admin-ajax.php?action=bookly_pro_staff_icalendar&token=5dbc2b4fa6543dd6f84206bab2f7ad41'
        },
        {
          id: 'sim2',
          label: 'Hermir 2',
          icalUrl: 'https://golf.golfsvitan.is/wp-admin/admin-ajax.php?action=bookly_pro_staff_icalendar&token=7ccf73f350aec906bff01b14281d030a'
        },
        {
          id: 'sim3',
          label: 'Hermir 3',
          icalUrl: 'https://golf.golfsvitan.is/wp-admin/admin-ajax.php?action=bookly_pro_staff_icalendar&token=3d7e0d66fddbab7fd1d85d69e11e1890'
        },
        {
          id: 'sim4',
          label: 'Hermir 4',
          icalUrl: 'https://golf.golfsvitan.is/wp-admin/admin-ajax.php?action=bookly_pro_staff_icalendar&token=99ca497d4042dbdd283b047e71b29ec1'
        }
      ]
    },
    egilsholl: {
      name: 'Egilshöll',
      simulators: [
        {
          id: 'sim1',
          label: 'Hermir 1',
          icalUrl: 'https://golf.golfsvitan.is/wp-admin/admin-ajax.php?action=bookly_pro_staff_icalendar&token=6fb8aafa426b27f75464e3e39badee1e'
        },
        {
          id: 'sim2',
          label: 'Hermir 2',
          icalUrl: 'https://golf.golfsvitan.is/wp-admin/admin-ajax.php?action=bookly_pro_staff_icalendar&token=ff3e223c141fed928f250dafe353369f'
        },
        {
          id: 'sim3',
          label: 'Hermir 3',
          icalUrl: 'https://golf.golfsvitan.is/wp-admin/admin-ajax.php?action=bookly_pro_staff_icalendar&token=66a18f66c067d632bd19ef68ddcb20b7'
        }
      ]
    }
  }
};
