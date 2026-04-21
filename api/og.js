import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler() {
  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          background: '#000000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 72px',
          fontFamily: 'sans-serif',
        },
        children: [
          // Top rail
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
              },
              children: [
                { type: 'span', props: { children: '/ BARE' } },
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', alignItems: 'center', gap: '10px' },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            width: '7px', height: '7px',
                            borderRadius: '50%',
                            background: '#ff8c42',
                          },
                        },
                      },
                      { type: 'span', props: { children: 'DIAGNOSTIC · LIVE' } },
                    ],
                  },
                },
                { type: 'span', props: { children: 'BRAND AESTHETIC REALITY ENGINE' } },
              ],
            },
          },

          // Main wordmark
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '0px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '240px',
                      fontWeight: '900',
                      color: '#ffffff',
                      lineHeight: '0.85',
                      letterSpacing: '-0.05em',
                    },
                    children: 'BARE',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '28px',
                      fontWeight: '700',
                      color: 'rgba(255,255,255,0.7)',
                      letterSpacing: '-0.01em',
                      marginTop: '20px',
                      maxWidth: '640px',
                      lineHeight: '1.3',
                    },
                    children: 'An AI tool built to catch brands that look AI-made.',
                  },
                },
              ],
            },
          },

          // Bottom row
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', gap: '32px' },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: { display: 'flex', flexDirection: 'column', gap: '4px' },
                          children: [
                            { type: 'div', props: { style: { fontSize: '52px', fontWeight: '900', color: '#ff8c42', lineHeight: '1', letterSpacing: '-0.04em' }, children: '6' } },
                            { type: 'div', props: { style: { fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }, children: '/ ASSAYS' } },
                          ],
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: { display: 'flex', flexDirection: 'column', gap: '4px' },
                          children: [
                            { type: 'div', props: { style: { fontSize: '52px', fontWeight: '900', color: '#ff8c42', lineHeight: '1', letterSpacing: '-0.04em' }, children: '100' } },
                            { type: 'div', props: { style: { fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }, children: '/ MAX SCORE' } },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '13px',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.3)',
                    },
                    children: 'bare.bananalab.studio',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { width: 1200, height: 630 }
  );
}
