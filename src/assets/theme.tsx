import { extendTheme } from '@chakra-ui/react'

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