import { TransactionEvent, LogDescription } from "forta-agent";
import * as Winston from "winston";
import { IApprovalMonitorClient } from "../services/ApprovalMonitor.srv";
import { Metrics } from "../utils/metrics";

export class ETHProvider implements IApprovalMonitorClient {
  constructor(
    private readonly logger: Winston.Logger,
    private readonly metrics: Metrics,
    private readonly txEvent: TransactionEvent
  ) {}

  public filterLog(eventSignature: string, contractAddress?: string): LogDescription[] {
    try {
      return this.txEvent.filterLog(eventSignature, contractAddress);
    } catch (error) {
      this.logger.error(`Error filtering logs: ${error}`);
      this.metrics.ethProviderErrors.inc();
      return [];
    }
  }
} 