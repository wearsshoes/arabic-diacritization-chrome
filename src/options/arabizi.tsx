
import {
	Text,
	Stack,
	Select,
	Box,
	Checkbox,
	Button,
	Switch,
	Textarea,
	Divider,
	Heading
} from '@chakra-ui/react'
import { CheckIcon, CloseIcon, AddIcon } from '@chakra-ui/icons'
import { Prompt } from '../common/types'
import { FormEvent, ChangeEvent } from 'react'
export const Arabizi: React.FC = () => {
	const customPrompt = ''
	const savedPrompts: Prompt[] = []
	return (
		<Stack spacing="4">
			<Stack id="transliterationMethod"
				align="flex-start"
			>
				<Stack spacing={0}>
					<Text
						lineHeight="1.5"
						alignSelf="stretch"
					>
						Transliteration method
					</Text>
					<Text
						fontSize={"sm"}
						alignSelf="stretch"
					>
						Provides varying degrees of precision and pronunciation guidance.
					</Text>
				</Stack>
				<Select
					placeholder="Literal transliteration (instant, ignores unmarked short vowels)"
					height="40px"
					alignSelf="stretch"
				/>
			</Stack>
			<Stack id="baseTransliteration"
				align="flex-start"
				spacing="10px"
				alignSelf="stretch"
			>
				<Stack
					alignSelf="stretch"
				>
					<Stack
						spacing="0px"
						alignSelf="stretch"
					>
						<Text
							lineHeight="1.5"
							alignSelf="stretch"
						>
							Base transliteration scheme
						</Text>
						<Text
							fontSize={"sm"}
							alignSelf="stretch"
						>
							Replaces Arabic letters with Latin equivalents without considering
							pronunciation rules.
						</Text>
					</Stack>
					<Select placeholder="ALA-LC Strict" height="40px" alignSelf="stretch" />
				</Stack>
			</Stack>
			<Stack id="transliterationOptions">
				<Heading>Transliteration Options</Heading>
				<Divider />
				<Stack id="dipthongRules"
					alignSelf="stretch"
					direction="row"
					justify="flex-end"
					align="center"
					spacing="0px"
				>
					<Stack
						align="flex-end" spacing="0px" flex="1">
						<Text
							lineHeight="1.5"
							alignSelf="stretch"
						>
							Use dipthong transcription rules
						</Text>
						<Text
							fontSize={"sm"}
							alignSelf="stretch"
						>
							Makes vowel combinations easier to read.
						</Text>
					</Stack>
					<Switch id="dipthongSwitch" />
				</Stack>
				<Stack id="digraphs"
					alignSelf="stretch"
					direction="row"
					justify="flex-end"
					align="center"
					spacing="0px"
				>
					<Stack align="flex-end" spacing="0px" flex="1">
						<Text
							lineHeight="1.5"

							alignSelf="stretch"
						>
							Separate confusing digraphs
						</Text>
						<Text
							fontSize={"sm"}
							alignSelf="stretch"
						>
							E.g. adʹham rather than adham
						</Text>
					</Stack>
					<Switch id="digraphsSwitch" />
				</Stack>
				<Stack id="sunMoonPronunciation"
					alignSelf="stretch"
					direction="row"
					justify="flex-end"
					align="center"
					spacing="0px"
				>
					<Stack align="flex-end" spacing="0px" flex="1">
						<Text
							lineHeight="1.5"

							alignSelf="stretch"
						>
							Follow sun/moon pronunciation rules
						</Text>

						<Text
							alignSelf="stretch"
							fontSize={"sm"}
						>
							<span>
								When al- is modified by the subsequent letter. Example:{' '}
							</span>
							<Box as="span" fontWeight="italic" fontStyle="italic">
								al-Taalib
							</Box>
							<Box as="span"> vs </Box>
							<Box as="span" fontWeight="italic" fontStyle="italic">
								aT-Taalib
							</Box>
						</Text>
					</Stack>
					<Switch id="sunMoonSwitch" />
				</Stack>
				<Stack id="respectAllah" display={'none'}
					alignSelf="stretch"
					direction="row"
					justify="flex-end"
					align="center"
					spacing="0px"
				>
					<Stack align="flex-end" spacing="0px" flex="1">
						<Text
							lineHeight="1.5"

							alignSelf="stretch"
						>
							Respect ‘Allāh’
						</Text>
						<Text

							alignSelf="stretch"
						>
							Always transcribe ٱللَّٰه as Allāh rather than al-laah,
							bismillāh vs. bism ‘llaah, etc.
						</Text>
					</Stack>
					<Switch id="respectAllahSwitch" />
				</Stack>
			</Stack>
			<Stack id="llmOptions">
				<Heading>LLM-only options</Heading>
				<Divider />
				<Stack id="taaMarbutaAlifMaqsura"
					alignSelf="stretch"
					direction="row"
					justify="flex-end"
					align="center"
					spacing="0px"
				>
					<Stack align="flex-end" spacing="0px" flex="1">
						<Text
							alignSelf="stretch"
						>
							Modify taa marbuta and alif maqsura
						</Text>
						<Text
							fontSize={"sm"}
							alignSelf="stretch"
						>
							a tough grammar rule! needs LLM
						</Text>
					</Stack>
					<Switch id="taaMarbutaSwitch" />
				</Stack>
				<Stack id="terminalCaseEndings"
					alignSelf="stretch"
					direction="row"
					justify="flex-end"
					align="center"
					spacing="0px"
				>
					<Stack align="flex-end" spacing="0px" flex="1">
						<Text
							lineHeight="1.5"

							alignSelf="stretch"
						>
							Ignore terminal case endings
						</Text>
						<Text
							fontSize={"sm"}
							alignSelf="stretch"
						>
							Case endings are normally not pronounced at the end of
							sentences.
						</Text>
					</Stack>
					<Switch id="caseEndingsSwitch" />
				</Stack>

				<Stack id="useConventional"
					alignSelf="stretch"
					direction="row"
					justify="flex-end"
					align="center"
					spacing="0px"
				>
					<Stack align="flex-end" spacing="0px" flex="1">
						<Text
							alignSelf="stretch"
						>
							Use conventional spellings and capitalize proper nouns
						</Text>
						<Text
							fontSize={"sm"}
							alignSelf="stretch"
						>
							like Qatar, Amr
						</Text>
					</Stack>
					<Switch id="conventionalSwitch" />
				</Stack>
				<Stack id="useDialect" display={'none'}
					direction="row"
					justify="flex-end"
					align="center"
					spacing="0px"
					alignSelf="stretch"
				>
					<Stack align="flex-end" spacing="0px" flex="1">
						<Text
							alignSelf="stretch"
						>
							Use dialect (experimental)
						</Text>
						<Text
							fontSize={"sm"}
							alignSelf="stretch"
						>
							E.g. when the LLM leaves out words.
						</Text>
					</Stack>
					<Select placeholder="Lebanese" width="160px" height="40px" />
				</Stack>
				<Stack id="useCustomPrompt" display={'none'}
					alignSelf="stretch"
					direction="row"
					justify="flex-end"
					align="center"
					spacing="0px"
				>
					<Stack align="flex-end" spacing="0px" flex="1">
						<Text
							lineHeight="1.5"
							alignSelf="stretch"
						>
							Use custom system prompt (ignores preceding options)
						</Text>
					</Stack>
					<Switch id="useCustomPrompt" />
				</Stack>
			</Stack>
			<Stack id="customPrompt" display={'none'}>
			<Heading>Custom Prompt</Heading>
			<Divider />
			<form id="savePromptForm" onSubmit={handleSavePrompt}>
				<Stack>
					<Stack direction='row'>
						<Select
							id="loadPrompt"
							name="loadPrompt"
							onChange={handleLoadPromptChange}
							flex="1"
						>
							{savedPrompts.map((prompt: Prompt) => (
								<option key={prompt.name} value={prompt.name}>
									{prompt.name}
								</option>
							))}
						</Select>
						<Button
							rightIcon={<CheckIcon data-icon="CkCheck" />}
							colorScheme="blue"
						>
							Save
						</Button>
						<Button
							rightIcon={<AddIcon data-icon="CkAdd" />}
							type="submit" id="savePromptBtn"
							colorScheme="blue"
						>
							Save as
						</Button>
						<Button
							rightIcon={<CloseIcon data-icon="CkClose" />}
							colorScheme="red"
							onClick={handleDeletePrompt}
						>
							Delete
						</Button>
					</Stack>
					<Textarea
						id="customPromptTextArea"
						name="customPrompt"
						rows={16}
						cols={50}
						value={customPrompt}
						onChange={handleCustomPromptChange}
					></Textarea>
					<Checkbox
						size="lg"
						defaultChecked={false}
						variant="blue"
						alignSelf="stretch"
					>
						Ask Claude to return the number of prompt tokens when saving
					</Checkbox>
				</Stack>
			</form>
			</Stack>
		</Stack>
	)
}
/* eslint-disable @typescript-eslint/no-unused-vars */
function handleSavePrompt(_event: FormEvent<HTMLFormElement>): void {
	throw new Error('Function not implemented.')
}
function handleLoadPromptChange(_event: ChangeEvent<HTMLSelectElement>): void {
	throw new Error('Function not implemented.')
}
function handleDeletePrompt(_event: React.MouseEvent<HTMLButtonElement>): void {
	throw new Error('Function not implemented.')
}
function handleCustomPromptChange(_event: ChangeEvent<HTMLTextAreaElement>): void {
	throw new Error('Function not implemented.')
}
