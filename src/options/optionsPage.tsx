import React, { ReactNode, useState } from 'react';
import ReactDOM from 'react-dom/client';

import LLMOptions from './promptOptions';
import APIKeyForm from './generalOptions';
import DataManagement from './dataManagement';
import { Arabizi } from './arabizi';

import theme from '../assets/theme';

import { ChakraProvider, HeadingProps, TextProps } from '@chakra-ui/react'
import {
  IconButton,
  Box,
  CloseButton,
  Flex,
  Icon,
  useColorModeValue,
  Link,
  Drawer,
  DrawerContent,
  Heading,
  useDisclosure,
  BoxProps,
  FlexProps,
} from '@chakra-ui/react';

import {
  FiPenTool,
  FiSave,
  FiSettings,
  FiActivity,
  FiMenu,
  FiMoon
} from 'react-icons/fi';

import { IconType } from 'react-icons';

import ReactMarkdown from 'react-markdown';
import faqContent from './faq.md?raw';

const chakraComponents = {
  h1: (props: HeadingProps) => <Heading as="h1" size="xl" my={4} {...props} />,
  h2: (props:  HeadingProps) => <Heading as="h2" size="lg" my={4} {...props} />,
  h3: (props: HeadingProps) => <Heading as="h3" size="md" my={3} {...props} />,
  p: (props: TextProps) => <Box fontSize={"md"} {...props} />,
};

const FAQComponent = () => {
  return <ReactMarkdown components={chakraComponents}>{faqContent}</ReactMarkdown>;
}

interface LinkItemProps {
  name: string;
  icon: IconType;
}
const LinkItems: Array<LinkItemProps> = [
  { name: 'General', icon: FiSettings },
  { name: 'Custom Prompt', icon: FiPenTool },
  { name: 'Local Data', icon: FiSave },
  { name: 'Transliteration', icon: FiMoon },
  { name: 'API Usage', icon: FiActivity },
  { name: 'FAQ', icon: FiActivity },
];

export default function SimpleSidebar({ children }: { children: ReactNode }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedItem, setSelectedItem] = useState('General');

  return (
    <Box>
      <SidebarContent
        onClose={() => onClose}
        display={{ base: 'none', md: 'block' }}
        onItemClick={(item) => setSelectedItem(item)}
      />
      <Drawer
        autoFocus={false}
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
        returnFocusOnClose={false}
        onOverlayClick={onClose}
        size="full">
        <DrawerContent>
          <SidebarContent onClose={onClose} onItemClick={() => { }} />
        </DrawerContent>
      </Drawer>
      <MobileNav display={{ base: 'flex', md: 'none' }} onOpen={onOpen} />

      <Box ml={{ base: 0, md: 60 }} px="10" py="4" maxWidth={"800px"}>
        <Heading size="2xl" pb="4">{selectedItem ?? "Options"}</Heading>
        {selectedItem === 'General' ? <APIKeyForm /> : children}
        {selectedItem === 'Custom Prompt' ? <LLMOptions /> : children}
        {selectedItem === 'Transliteration' ? <Arabizi /> : children}
        {selectedItem === 'Local Data' ? <DataManagement /> : children}
        {selectedItem === 'FAQ' ? <FAQComponent /> : children}
      </Box>
    </Box>
  );
}
interface SidebarProps extends BoxProps {
  onClose: () => void;
  onItemClick: (item: string) => void;
}


const SidebarContent = ({ onClose, onItemClick, ...rest }: SidebarProps) => {
  return (
    <Box
      bg={useColorModeValue('gray.100', 'gray.900')}
      borderRight="1px"
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w={{ base: 'full', md: 60 }}
      pos="fixed"
      h="full"
      {...rest}>
      <Flex h="240" alignItems="center" mx="4" justifyContent="space-between">
        <Box
          bg="white"
          paddingX="20px"
          paddingY="12px"
          paddingTop={"48px"}
          paddingRight={"32px"}
          borderColor="#000000"
          borderStartWidth="1px"
          borderEndWidth="1px"
          borderTopWidth="1px"
          borderBottomWidth="1px"
        >
          <Heading
            lineHeight="1.2"
            fontWeight="black"
            fontSize="36px"
            textTransform="uppercase"
            color="#000000"
          >
            Easy<br />Peasy<br />Arabizi
          </Heading>
        </Box>
        <CloseButton display={{ base: 'flex', md: 'none' }} onClick={onClose} />
      </Flex>
      {LinkItems.map((link) => (
        <NavItem
          key={link.name}
          icon={link.icon}
          onClick={() => onItemClick(link.name)}
        >
          {link.name}
        </NavItem>
      ))}
    </Box>
  );
};



interface NavItemProps extends FlexProps {
  icon: IconType;
  children: ReactNode;
  onClick: () => void;
}

const NavItem = ({ icon, children, onClick, ...rest }: NavItemProps) => {
  return (
    <Link href="#" variant="menu" style={{ textDecoration: 'none' }} _focus={{ boxShadow: 'none' }} onClick={onClick}>
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        _hover={{
          bg: 'cyan.400',
          color: 'white',
        }}
        {...rest}>
        {icon && (
          <Icon
            mr="4"
            fontSize="16"
            _groupHover={{
              color: 'white',
            }}
            as={icon}
          />
        )}
        {children}
      </Flex>
    </Link>
  );
};

interface MobileProps extends FlexProps {
  onOpen: () => void;
}
const MobileNav = ({ onOpen, ...rest }: MobileProps) => {
  return (
    <Flex
      ml={{ base: 0, md: 60 }}
      px={{ base: 4, md: 24 }}
      bg={useColorModeValue('gray.100', 'gray.900')}
      borderBottomWidth="1px"
      borderBottomColor={useColorModeValue('gray.200', 'gray.700')}
      alignItems="center"
      {...rest}>
      <IconButton
        variant="outline"
        onClick={onOpen}
        aria-label="open menu"
        icon={<FiMenu />}
      />
      <Heading
        fontWeight="black"
        textTransform="uppercase"
      >
        Easy Peasy Arabizi
      </Heading>
    </Flex>
  );
};

ReactDOM.createRoot(document.getElementById('options-root')!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <SimpleSidebar children={undefined}></SimpleSidebar>
    </ChakraProvider>
  </React.StrictMode>,
)