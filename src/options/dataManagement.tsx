import React, { useEffect, useState } from 'react';
import {
  Stack,
  Text,
  Button,
  Select,
  Stat,
  StatNumber,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Box,
  useMediaQuery,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  SimpleGrid,
  Link,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  StatHelpText,
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';

const DataManagement: React.FC = () => {
  const [saves, setSaves] = useState<{ url: string; bytes: number; lastVisited: Date }[]>([]);
  const [storageUsed, setStorageUsed] = useState<number>(0);
const maxStorage = chrome.storage.local.QUOTA_BYTES;
  const [databaseMessage, setDatabaseMessage] = useState<string>('');
  const [sortBy, setSortBy] = useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'storage', order: 'desc' });
  const [isMobile] = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    chrome.storage.local.get(null, async (items) => {
      const saves = await Promise.all(
        Object.keys(items).map(async (key) => {
          return {
            url: key,
            bytes: await chrome.storage.local.getBytesInUse(key),
            lastVisited: new Date(Date.parse(items[key].lastVisited)),
          };
        })
      );
      setSaves(saves);
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
      setStorageUsed(bytesInUse);
    });
  }, []);

  const handleClearDatabase = () => {
    if (confirm('Are you sure you want to clear the database?')) {
      try {
        chrome.storage.local.clear();
        setDatabaseMessage('Database cleared');
        setSaves([]);
        setStorageUsed(0);
      } catch (error) {
        error instanceof Error
          ? setDatabaseMessage(`Failed to clear the database: ${error.message}`)
          : setDatabaseMessage(`Unknown error occurred, ${error}`);
      }
    }
  };

  const handleSort = (key: string, event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setSortBy((prev) => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedSaves = [...saves].sort((a, b) => {
    if (sortBy.key === 'date') {
      return sortBy.order === 'asc'
        ? a.lastVisited.getTime() - b.lastVisited.getTime()
        : b.lastVisited.getTime() - a.lastVisited.getTime();
    } else if (sortBy.key === 'storage') {
      return sortBy.order === 'asc' ? a.bytes - b.bytes : b.bytes - a.bytes;
    }
    return 0;
  });

  return (
    <Stack width={"100%"} alignItems='start'>
      <Stack
        direction="row"
        spacing={4}
      >
        <Flex flex={1}>
          <CircularProgress value={(storageUsed / maxStorage) * 100} size="80px" color="yellow.400" trackColor="green.400">
            <CircularProgressLabel>
              {Math.round((storageUsed / maxStorage) * 100)}%
            </CircularProgressLabel>
          </CircularProgress>
        </Flex>
        <Stat minW="fit-content">
          <Text color="gray.700">Storage used</Text>
          <StatNumber>{(storageUsed / 10e5).toFixed(3)} mb</StatNumber>
          <StatHelpText>of {(maxStorage / 10e5).toFixed(3)}mb</StatHelpText>
        </Stat>
        <Stat minW="fit-content">
          <Text color="gray.700">Pages cached</Text>
          <StatNumber>{saves.length} pages</StatNumber>
            <StatHelpText>
            <Button
              id="clearDatabaseBtn"
              size="sm"
              variant='link'
              colorScheme="red"
              onClick={handleClearDatabase}
              rightIcon={<DeleteIcon />}
            >
              Clear All
            </Button>
            </StatHelpText>
        </Stat>
      </Stack>
      <Text id="databaseMessage">{databaseMessage}</Text>
      {isMobile ? (
        <MobileView sortedSaves={sortedSaves} setSaves={setSaves} saves={saves} handleSort={handleSort} sortBy={sortBy} />
      ) : (
        <DataTable sortedSaves={sortedSaves} handleSort={handleSort} sortBy={sortBy} setSaves={setSaves} saves={saves} />
      )}
    </Stack>
  );
};

const DataTable: React.FC<{
  sortedSaves: { url: string; bytes: number; lastVisited: Date }[];
  handleSort: (key: string) => void;
  sortBy: { key: string; order: 'asc' | 'desc' };
  setSaves: React.Dispatch<React.SetStateAction<{ url: string; bytes: number; lastVisited: Date }[]>>;
  saves: { url: string; bytes: number; lastVisited: Date }[];
}> = ({ sortedSaves, handleSort, sortBy, setSaves, saves }) => {
  return (
    <Table variant="striped" size="sm" layout="fixed">
      <Thead>
        <Tr>
          <Th fontSize="md" width={{ md: "80%", lg: "55%" }}>URL</Th>
          <Th px={0} width={{ md: "30%", lg: "15%" }} >
            <Button size="md" variant="link" onClick={() => handleSort('date')}>
              DATE {sortBy.key === 'date' ? (sortBy.order === 'asc' ? '↑' : '↓') : '•'}
            </Button>
          </Th>
          <Th px={{ md: 0, lg: 2 }} width={{ md: "30%", lg: "15%" }}>
            <Button size="md" variant="link" onClick={() => handleSort('storage')}>
              STORAGE {sortBy.key === 'storage' ? (sortBy.order === 'asc' ? '↑' : '↓') : '•'}
            </Button>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {sortedSaves.map((save, index) => (
          <Tr key={index} >
            <Td
              px={2}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              <Link href={save.url} target="_blank" rel="noopener noreferrer">
                {decodeURI(save.url)}
              </Link>
            </Td>
            <Td whiteSpace="nowrap" px={0} >{save.lastVisited.toLocaleDateString()}</Td>
            <Td px={2}>
              <Stack direction="row" align="center" justifyContent="flex-end" whiteSpace="nowrap" spacing={1}>
                <Box flex={1} >{(save.bytes / 1000).toFixed(2)} kb</Box>
                <IconButton
                  aria-label="Delete"
                  icon={<DeleteIcon />}
                  size="xs"
                  onClick={() => {
                    chrome.storage.local.remove(save.url);
                    setSaves(saves.filter((s) => s.url !== save.url));
                  }}
                  colorScheme="red"
                  ml={2}
                />
              </Stack>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>

  );
};

const MobileView: React.FC<{
  sortedSaves: { url: string; bytes: number; lastVisited: Date }[];
  setSaves: React.Dispatch<React.SetStateAction<{ url: string; bytes: number; lastVisited: Date }[]>>;
  saves: { url: string; bytes: number; lastVisited: Date }[];
  handleSort: (key: string, event?: React.FormEvent<HTMLFormElement>) => void;
  sortBy: { key: string; order: 'asc' | 'desc' };
}> = ({ sortedSaves, setSaves, saves, handleSort, sortBy }) => {
  return (
    <Stack spacing={4}>
      <form onSubmit={(e) => handleSort((e.currentTarget.elements.namedItem('sortSelect') as HTMLSelectElement).value, e)}>
        <Stack direction="row" align="center" justify={'start'}>
          <Select name="sortSelect" size="md" variant={"flushed"} defaultValue={sortBy.key} width={'fit-content'}>
            <option value="date">Date</option>
            <option value="storage">Storage</option>
          </Select>
          <Button type="submit">Sort {sortBy.key && sortBy.order === 'asc' ? '↑' : '↓'}</Button>
        </Stack>
      </form>
      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
        {sortedSaves.map((save, index) => (
          <Card key={index} variant={'outline'} textAlign={'center'}>
            <CardHeader p={2} pb={0}>
              <Stack direction="row" align="center" justify={'space-around'}>
                <Box>
                  <Text>{save.lastVisited.toLocaleDateString()}</Text>
                </Box>
                <Box>
                  <Text>{(save.bytes / 1000).toFixed(2)} kb</Text>
                </Box>
              </Stack>
            </CardHeader>
            <CardBody p={2} display="flex" flexDirection="column" justifyContent="flex-end" flexGrow={1}>
              <Link fontSize={"xs"} href={save.url} target="_blank" rel="noopener noreferrer">
                {decodeURI(save.url)}
              </Link>
            </CardBody>
            <CardFooter padding={0} display="flex" justifyContent="flex-end">
              <IconButton
                aria-label="Delete"
                icon={<DeleteIcon />}
                size="sm"
                roundedTop={0}
                flex={1}
                onClick={() => {
                  chrome.storage.local.remove(save.url);
                  setSaves(saves.filter((s) => s.url !== save.url));
                }}
                colorScheme="red"
              />
            </CardFooter>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
};

export default DataManagement;