import { extendTheme } from '@chakra-ui/react'
import '@fontsource-variable/cairo-play';
import '@fontsource-variable/inter'

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
        heading: `Inter Variable, sans-serif`,
        body: `Inter Variable, sans-serif`,
        arabic: `'Cairo Play Variable', sans-serif`,
    },
    styles: {
    },

    components: {
        Link: {
            baseStyle: {
                color: 'blue.500',
                _hover: {
                    textDecoration: 'underline',
                },
            },
            variants: {
                menu: {
                    color: 'gray.600',
                    fontSize: 'md',
                    _hover: {
                        color: 'gray.900',
                    },
                },
            },
        },
        Container: {
            baseStyle: {
                maxW: { base: 'container.sm', xl: 'container.xl' },
                minH: { base: 'container.sm', xl: 'container.md' },
                borderRadius: 'xl',
                padding: { base: 2, xl: 5 },
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
        Divider: {
            baseStyle: {
                borderColor: 'gray.900',
                borderWidth: '1px',
            },
        },
        Heading: {
            baseStyle: {
                fontFamily: 'heading',
                textTransform: 'uppercase',
                fontWeight: '100',
                lineHeight: 'shorter',
                marginTop: '4',
                size: "md",
            },
            variants: {
                heading1: {
                    fontFamily: 'basmala',
                    size: 'xl',
                    marginTop: '1'
                }
            }
        },
        Switch:
        {
            baseStyle: {
                size: 'lg',
            },
        },
        Text: {
            baseStyle: {
                fontFamily: 'body',
                fontSize: 'md',
            },
            variants: {
                p: {
                    fontSize: 'md',
                    lineHeight: 'tall',
                },
                text: {
                    fontSize: 'md',
                    lineHeight: 'tall',
                },
            },
        },
    }
});

export default theme;