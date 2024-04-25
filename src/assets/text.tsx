import { Text as ChakraText, TextProps } from '@chakra-ui/react';

interface Props extends TextProps {
  lang?: string;
}

function Text({ lang, ...props }: Props) {
  return (
    <ChakraText
      fontFamily={lang === 'ar' ? 'arabic' : 'body'}
      {...props}
    />
  );
}

export default Text;