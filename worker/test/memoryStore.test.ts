import { describe } from 'vitest'
import { MemoryLibraryStore } from '../src/library/store'
import { libraryStoreContract } from './storeContract'

describe('MemoryLibraryStore', () => {
  libraryStoreContract(async () => new MemoryLibraryStore())
})
