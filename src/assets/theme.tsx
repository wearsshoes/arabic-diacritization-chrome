import { extendTheme } from '@chakra-ui/react'
import '@fontsource-variable/cairo-play';

const breakpoints = {
    sm: '320px',
    md: '768px',
    lg: '960px',
    xl: '1200px',
    '2xl': '1536px',
};

const theme = extendTheme({
    breakpoints,

    fonts: {
        heading: `Baskerville, sans-serif`,
        body: `Verdana, sans-serif`,
        arabic: `'Cairo Play Variable', sans-serif`,
    },
    styles: {
        global: {
            body: {
                bg: '#053426',
                color: 'black',
            },

        },
    },

    components: {
        Text: {
            baseStyle: {
                color: 'black',
                margin: '1',
            },
        },
        Container: {
            baseStyle: {
                maxW: { base: 'container.sm', xl: 'container.xl' },
                minH: { base: 'container.sm', xl: 'container.md' },
                borderRadius: 'xl',
                padding: { base: 2, xl: 5 },
                bg: '#d9c19d',
            }
        },
        Grid: {
            baseStyle: {
                gap: { base: 2, md: 4 },
            },

        },
        Card: {
            baseStyle: {
                bg: '#fbeed7',
                cardBg: '#fbeed7',
                padding: { base: 2, md: 5 },
            }
        },
        Heading: {
            variants: {
                heading1: {
                    fontFamily: 'basmala',
                    size: 'xl',
                    marginTop: '1'
                }
            }
        }
    }
});

export default theme;