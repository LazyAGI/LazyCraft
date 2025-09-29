import { get, post } from './base'
import type {
  CreateUpdateMcpParams,
  CreateUpdateMcpResponse,
  DeleteMcpParams,
  DeleteMcpResponse,
  GetMcpParams,
  GetMcpResponse,
  McpListParams,
  McpListResponse,
  SyncMcpParams,
  SyncMcpResponse,
} from '@/shared/types/toolsMcp'

export const getMcpList = ({ body }: { body: McpListParams }): Promise<McpListResponse> => post('/mcp/servers', { body })
export const deleteMcp = ({ body }: { body: DeleteMcpParams }): Promise<DeleteMcpResponse> => post('/mcp/servers/delete', { body })
export const editMcp = ({ body }: { body: CreateUpdateMcpParams }): Promise<CreateUpdateMcpResponse> => post('/mcp/servers/create-update', { body })
export const addMcp = ({ body }: { body: CreateUpdateMcpParams }): Promise<CreateUpdateMcpResponse> => post('/mcp/servers/create-update', { body })
export const getMcp = ({ body }: { body: GetMcpParams }): Promise<GetMcpResponse> => post('/mcp/tools', { body })
export const testMcp = ({ body }: { body: SyncMcpParams }): Promise<SyncMcpResponse> => post('/mcp/tools/test-tool', { body }, { silent: true })
export const publishMcp = ({ body }: { body: SyncMcpParams }): Promise<SyncMcpResponse> => post('/mcp/servers/publish', { body })
export const getMcpDetail = ({ body }: { body: GetMcpParams }): Promise<GetMcpResponse> => get('/mcp/servers/detail', { params: body })
export const enableMcp = ({ body }: { body: SyncMcpParams }): Promise<SyncMcpResponse> => post('/mcp/servers/enable', { body })
