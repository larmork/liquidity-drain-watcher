import { Finding, FindingSeverity, FindingType, LogDescription } from "forta-agent";
import * as Winston from "winston";

export interface IApprovalMonitorClient {
  filterLog(eventSignature: string, contractAddress?: string): LogDescription[];
}

export class ApprovalMonitorSrv {
  private findingsCount = 0;
  private approvalCounts: { [address: string]: number } = {};
  private readonly HIGH_APPROVAL_PER_HOUR = 25;
  private readonly MEDIUM_APPROVAL_PER_HOUR = 15;
  private readonly MAX_FINDINGS_PER_TX = 5;

  constructor(
    private readonly logger: Winston.Logger,
    private readonly client: IApprovalMonitorClient
  ) {
    // Reset approval counts every hour
    setInterval(() => {
      this.approvalCounts = {};
    }, 3600000); // 1 hour in milliseconds
  }

  private getSeverity(nApproval: number): FindingSeverity {
    if (nApproval > this.HIGH_APPROVAL_PER_HOUR) {
      return FindingSeverity.High;
    } else if (nApproval > this.MEDIUM_APPROVAL_PER_HOUR) {
      return FindingSeverity.Medium;
    }
    return FindingSeverity.Low;
  }

  public handleTransaction(): Finding[] {
    const findings: Finding[] = [];

    // Avoid spamming
    if (this.findingsCount >= this.MAX_FINDINGS_PER_TX) {
      return findings;
    }

    // Filter for Approval events
    const approvalEvents = this.client.filterLog(
      "Approval(address,address,uint256)",
      undefined // You can specify contract address here if you want to monitor specific tokens
    );

    // Process each approval event
    approvalEvents.forEach((event: LogDescription) => {
      const tokenContract = event.address.toLowerCase();
      this.approvalCounts[tokenContract] = (this.approvalCounts[tokenContract] || 0) + 1;

      // Check if the number of approvals is suspicious
      if (this.approvalCounts[tokenContract] >= 10) {
        findings.push(
          Finding.fromObject({
            name: "Suspicious amount of token approvals",
            description: `High number of token approvals detected: ${this.approvalCounts[tokenContract]}`,
            alertId: "FORTA-1",
            type: FindingType.Suspicious,
            severity: this.getSeverity(this.approvalCounts[tokenContract]),
            metadata: {
              address: tokenContract,
              approvalCount: this.approvalCounts[tokenContract].toString()
            }
          })
        );
      }
    });

    this.findingsCount += findings.length;
    return findings;
  }
} 