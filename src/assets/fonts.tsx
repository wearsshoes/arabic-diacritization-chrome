import { Global } from '@emotion/react'

const Fonts = () => (
  <Global
    styles={`
      @font-face {
        font-family: basmala;
        src: url(../../fonts/basmala/Basmala.ttf); 
      } 
      `}
  />
)

export default Fonts