import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
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
  const inputTokens = usageRecords.reduce((acc, record) => acc + record.inputTokens, 0);
  const outputTokens = usageRecords.reduce((acc, record) => acc + record.outputTokens, 0);
  const lastIndex = usageRecords.length - (usageRecords.length % displayLength);

  const haikuInputCost = 0.25 / (10 ** 6);
  const haikuOutputCost = 1.25 / (10 ** 6);
  // TODO: Add costs for other models
  // const sonnetInputCost = 3 / (10 ** 6);
  // const sonnetOutputCost = 15 / (10 ** 6);
  // const opusInputCost = 15 / (10 ** 6);
  // const opusOutputCost = 75 / (10 ** 6);

  const totalExpenditure = (inputTokens * haikuInputCost) + (outputTokens * haikuOutputCost);

  const handleTruncateRecords = useCallback((startIndex: number, length: number) => {
    setTableRecords(usageRecords.slice(startIndex, startIndex + length));
  }, [usageRecords]);

  useEffect(() => {
    chrome.storage.sync.get(['usageRecords'], (data) => {
      setUsageRecords(data.usageRecords);
    });

    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      for (const [key, change] of Object.entries(changes)) {
        switch (key) {
          case 'usageRecords':
            setUsageRecords(change.newValue);
            break;
          default:
            break;
        }
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  useEffect(() => {
    handleTruncateRecords(startIndex, displayLength);
  }, [handleTruncateRecords, usageRecords, startIndex, displayLength]);

  return (
    <Box>
      <Heading as='h1' size='lg'>API Usage Summary</Heading>
      <Text> Total API Calls: {usageRecords.length} </Text>
      <Text> Total Input Tokens: {inputTokens} </Text>
      <Text> Total Output Tokens: {outputTokens} </Text>
      <Text> Total Expenditure: ${totalExpenditure.toFixed(2)} </Text>

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