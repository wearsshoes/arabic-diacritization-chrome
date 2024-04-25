import { extendTheme } from '@chakra-ui/react'
import '@fontsource-variable/cairo-play';

const theme = extendTheme({
    components: {
        Text: {
            baseStyle: {
                color: 'black',
                margin: '1',
            },
        },
        Button: {
            baseStyle: {
                colorScheme: 'yellow',
            },
        },
    },
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
})

export default theme