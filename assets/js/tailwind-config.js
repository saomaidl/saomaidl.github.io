document.addEventListener("DOMContentLoaded", function () {
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          pink: "#EF7C8E",
          'gray-text': '#181818',
          'tap-highlight': 'transparent',
          'black/12': 'hsla(0,0%,100%,.1)',
          'text-subdued': '#656565',
          'black': '#000',
          'icon': '#0f0f0f',
        },
        lineHeight: {
          normal: 'normal',
          1: '1',
        },
        minHeight: {
          '48px': '48px',
          8: '32px',
        },
        backgroundColor: {
          'gray-top': '#181818',
        },
        padding: {
          '12px': '12px',
          '12-16': '12px 16px',
          '0-16': '0 16px',
        },
        fontSize: {
          marginal: '0.6875rem',
        },
        fontFamily: {
          saomaiHeading: ['saomaiHeading', 'Arial', 'sans-serif'],
        },
        translate: {
          '1-2': '50%',
        },
        spacing: {
          '70px': '70px',
        },
        letterSpacing: {
          inherit: 'inherit',
        },
        overflowWrap: {
          clip: 'break-word',
        },
        verticalAlign: {
          middle: 'middle',
        },
        minInlineSize: {
          '0': '0px',
        },
        transitionDuration: {
          '33': '33ms',
        },
      },
    },
    plugins: [
      function ({ addComponents }) {
        addComponents({
          'h1, h2, h3, h4, h5, h6': {
            '@apply font-saomaiHeading font-bold': {},
          },
        });
      },
      function ({ addBase }) {
        addBase({
          'audio, canvas, embed, iframe, img, object, svg, video': {
            display: 'inline-block',
          },
        });
      },
      function ({ addUtilities }) {
        addUtilities({
          '.encore-text': {
            '-webkit-box-sizing': 'border-box',
            'box-sizing': 'border-box',
            '-webkit-tap-highlight-color': 'transparent',
            'color': 'inherit',
            'margin-block': '0',
          },
          'body': {
            'font-family': 'saomai, Arial, sans-serif',
            'background-color': '#fff',
            'margin': '0',
            '-webkit-tap-highlight-color': 'hsla(0, 0%, 100%, .1)',
            'display': 'flex',
            'letter-spacing': '-0.022rem',
          },
          '.scrollbar-none': {
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            '-ms-overflow-style': 'none',
            'scrollbar-width': 'none',
          },
          '.transition-duration-33': {
            'transition-duration': '33ms',
          },
          '.top-1-2': {
            top: '50%',
          },
          '.right-3': {
            right: '12px',
          },
          '.line-clamp-2': {
            display: '-webkit-box',
            '-webkit-box-orient': 'vertical',
            '-webkit-line-clamp': '2',
            overflow: 'hidden',
            'min-height': '1.5rem',
            'max-height': '3rem',
            'white-space': 'pre-wrap',
          },
          '.overflow-wrap-anywhere': {
            'overflow-wrap': 'anywhere',
          },
          '.vertical-align-middle': {
            'vertical-align': 'middle',
          },
        }, ['responsive', 'hover']);
      },
    ],
  };
});
