import { deserializeMessage, type JSONRPCMessage } from "@modelcontextprotocol/client";

/** SDK ReadBuffer 会跳过非法 JSON；Host 严格拒绝污染 stdout，协议结构仍由 SDK 校验。 */
export class McpStdioMessageBuffer {
  private readonly decoder = new TextDecoder("utf-8", { fatal: true });
  private fragments: Buffer[] = [];
  private bytes = 0;

  public constructor(private readonly maxBytes: number) {}

  public append(chunk: Buffer, receive: (message: JSONRPCMessage) => void): void {
    let start = 0;
    while (start < chunk.length) {
      const newline = chunk.indexOf(10, start);
      const end = newline === -1 ? chunk.length : newline;
      const fragment = chunk.subarray(start, end);
      this.bytes += fragment.length;
      if (this.bytes > this.maxBytes || this.fragments.length >= 4_096) {
        throw new Error("MCP message buffer limit");
      }
      this.fragments.push(fragment);
      if (newline === -1) return;
      const line = this.decoder.decode(Buffer.concat(this.fragments, this.bytes));
      this.clear();
      receive(deserializeMessage(line));
      start = newline + 1;
    }
  }

  public clear(): void {
    this.fragments = [];
    this.bytes = 0;
  }
}
