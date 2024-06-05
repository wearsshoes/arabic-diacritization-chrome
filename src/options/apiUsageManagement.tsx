import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Th,
  Tr,
  Td,
  Stack,
  ButtonGroup,
  Button,
  Select,
  Divider,
} from '@chakra-ui/react';
import { APIUsageRecord } from '../common/optionsClass';
import { FiChevronLeft, FiChevronRight, FiChevronsRight, FiChevronsLeft } from 'react-icons/fi';
import {
  // Chart,
  // LineController,
  // LineElement,
  // PointElement,
  // CategoryScale,
  // LinearScale,
  // Title,
} from 'chart.js';

// TODO: (post-v1.0) have these sorted by page processed also

const APIUsageManagement: React.FC = () => {
  const [usageRecords, setUsageRecords] = useState<APIUsageRecord[]>([]);
  const [tableRecords, setTableRecords] = useState<APIUsageRecord[]>([]);
  const [startIndex, setStartIndex] = useState<number>(0);
  const [displayLength, setLength] = useState<number>(10);
  const lastIndex = usageRecords.length - (usageRecords.length % displayLength);

  const calculateModelUsage = (records: APIUsageRecord[], inputCost: number, outputCost: number) => {
    const inputTokens = records.reduce((acc, record) => acc + record.inputTokens, 0);
    const outputTokens = records.reduce((acc, record) => acc + record.outputTokens, 0);
    const expenditure = (inputTokens * inputCost) + (outputTokens * outputCost);

    return { inputTokens, outputTokens, expenditure };
  };

  const haikuRecords = usageRecords.filter((record) => record.model.includes('haiku'));
  const haikuInputCost = 0.25 / (10 ** 6);
  const haikuOutputCost = 1.25 / (10 ** 6);
  const haikuUsage = calculateModelUsage(haikuRecords, haikuInputCost, haikuOutputCost);

  const sonnetRecords = usageRecords.filter((record) => record.model.includes('sonnet'));
  const sonnetInputCost = 3 / (10 ** 6);
  const sonnetOutputCost = 15 / (10 ** 6);
  const sonnetUsage = calculateModelUsage(sonnetRecords, sonnetInputCost, sonnetOutputCost);

  const opusRecords = usageRecords.filter((record) => record.model.includes('opus'));
  const opusInputCost = 15 / (10 ** 6);
  const opusOutputCost = 75 / (10 ** 6);
  const opusUsage = calculateModelUsage(opusRecords, opusInputCost, opusOutputCost);

  const totalExpenditure = haikuUsage.expenditure + sonnetUsage.expenditure + opusUsage.expenditure;

  const handleTruncateRecords = useCallback((startIndex: number, length: number) => {
    setTableRecords(usageRecords.slice(startIndex, startIndex + length));
  }, [usageRecords]);

  useEffect(() => {
    chrome.storage.sync.get(['usageRecords'], (data) => {
      const list: APIUsageRecord[] = data.usageRecords;
      setUsageRecords(list.reverse());
    });

    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      for (const [key, change] of Object.entries(changes)) {
        switch (key) {
          case 'usageRecords': {
            const newList: APIUsageRecord[] = change.newValue;
            setUsageRecords(newList.reverse);
          }
            break;
          default:
            break;
        }
      }
    };

    chrome.storage.sync.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.sync.onChanged.removeListener(storageListener);
    };
  }, []);

  useEffect(() => {
    handleTruncateRecords(startIndex, displayLength);
  }, [handleTruncateRecords, usageRecords, startIndex, displayLength]);

  return (
    <Box>
      <Heading as='h1' size='lg'>API Usage Summary</Heading>
      <Box outline={'1px solid'} borderColor={'gray.200'} borderRadius={5} mt={2} p={2}>
        <Text fontSize={'sm'} m={1} textAlign={'center'} fontWeight={'bold'}>Total API Calls: {usageRecords.length}</Text>
        <Divider mt={2} />
        <Table variant='simple' size='sm' mt={4}>
          <Thead>
            <Tr>
              <Th>Model</Th>
              <Th>Input Tokens</Th>
              <Th>Output Tokens</Th>
              <Th>Expenditure</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td>Haiku</Td>
              <Td>{haikuUsage.inputTokens}</Td>
              <Td>{haikuUsage.outputTokens}</Td>
              <Td>${haikuUsage.expenditure.toFixed(2)}</Td>
            </Tr>
            <Tr>
              <Td>Sonnet</Td>
              <Td>{sonnetUsage.inputTokens}</Td>
              <Td>{sonnetUsage.outputTokens}</Td>
              <Td>${sonnetUsage.expenditure.toFixed(2)}</Td>
            </Tr>
            <Tr>
              <Td>Opus</Td>
              <Td>{opusUsage.inputTokens}</Td>
              <Td>{opusUsage.outputTokens}</Td>
              <Td>${opusUsage.expenditure.toFixed(2)}</Td>
            </Tr>
          </Tbody>
          <Tfoot >
            <Tr >
              <Th>Total</Th>
              <Th></Th>
              <Th></Th>
              <Th>${totalExpenditure.toFixed(2)}</Th>
            </Tr>
          </Tfoot>
        </Table>
      </Box>

      <Heading as='h1' size='lg'>API Usage Records</Heading>
      <Box outline={'1px solid'} borderColor={'gray.200'} borderRadius={5} mt={2} p={2} pb={0}>
        <Stack direction='row' align={'center'} justify='space-between' mx={2} mb={0}>
          <Text fontSize='xs' fontWeight={'bold'}>{startIndex + 1}-{startIndex + tableRecords.length} of {usageRecords.length}</Text>
          <ButtonGroup size='xs' variant='ghost' spacing={0}>
            <Button
              id='firstPage'
              leftIcon={<FiChevronsLeft />}
              onClick={() => setStartIndex(0)}
            >
              First
            </Button>
            <Button
              id='prevPage'
              leftIcon={<FiChevronLeft />}
              onClick={() => setStartIndex(startIndex - displayLength < 0 ? 0 : startIndex - displayLength)}
            >
              Prev
            </Button>
            <Select
              id='recordsPerPage'
              size='xs'
              w='fit-content'
              value={displayLength.toString()}
              onChange={(e) => { setLength(parseInt(e.target.value)) }}
            >
              <option>10</option>
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </Select>
            <Button
              id='nextPage'
              rightIcon={<FiChevronRight />}
              onClick={() => setStartIndex(startIndex + displayLength > lastIndex ? lastIndex : startIndex + displayLength)}
            >
              Next
            </Button>
            <Button
              id='lastPage'
              rightIcon={<FiChevronsRight />}
              onClick={() => setStartIndex(lastIndex)}
            >
              Last
            </Button>
          </ButtonGroup>
        </Stack>
        <Divider my={2} />
        <Table size='sm' variant='striped'>
          <Thead>
            <Tr>
              <Th>#</Th>
              <Th>Date</Th>
              <Th>Model</Th>
              <Th>Input</Th>
              <Th>Output</Th>
            </Tr>
          </Thead>
          <Tbody>
            {tableRecords.map((record, index) => {
              const { model, inputTokens, outputTokens } = record;
              const date = new Date(Date.parse(record.date)).toLocaleString();
              return (
                <Tr key={index}>
                  <Td>{startIndex + index + 1}</Td>
                  <Td>{date}</Td>
                  <Td>{model}</Td>
                  <Td>{inputTokens}</Td>
                  <Td>{outputTokens}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Box>
  )
};

export default APIUsageManagement;