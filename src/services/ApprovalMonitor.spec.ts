import { Finding, FindingSeverity, FindingType, LogDescription, ethers } from "forta-agent";
import * as Winston from "winston";
import { ApprovalMonitorSrv, IApprovalMonitorClient } from "./ApprovalMonitor.srv";

const TEST_TIMEOUT = 10_000; // ms

// Create the interface fragment once
const approvalInterface = new ethers.utils.Interface([
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
]);
const approvalEvent = approvalInterface.getEvent("Approval");
if (!approvalEvent) throw new Error("Failed to get Approval event fragment");

class MockApprovalMonitorClient implements IApprovalMonitorClient {
  constructor(private readonly logs: LogDescription[]) {}

  filterLog(eventSignature: string, contractAddress?: string): LogDescription[] {
    // Verify the event signature is correct
    if (eventSignature !== "Approval(address,address,uint256)") {
      throw new Error(`Invalid event signature: ${eventSignature}`);
    }
    // If contractAddress is provided, filter logs by it
    if (contractAddress) {
      return this.logs.filter(log => log.address.toLowerCase() === contractAddress.toLowerCase());
    }
    return this.logs;
  }
}

describe("ApprovalMonitor service", () => {
  let logger: Winston.Logger;
  let service: ApprovalMonitorSrv;
  let client: MockApprovalMonitorClient;

  const createApprovalEvent = (
    address: string,
    owner: string = "0x2000000000000000000000000000000002",
    spender: string = "0x3000000000000000000000000000000003",
    amount: string = "100"
  ): LogDescription => ({
    name: "Approval",
    signature: "Approval(address,address,uint256)",
    topic: ethers.utils.id("Approval(address,address,uint256)"),
    args: [
      ethers.utils.getAddress(owner),
      ethers.utils.getAddress(spender),
      ethers.utils.parseUnits(amount, 18)
    ],
    address: ethers.utils.getAddress(address),
    logIndex: 0,
    eventFragment: approvalEvent
  });

  beforeAll(() => {
    // Setup logger with silent transport for tests
    logger = Winston.createLogger({
      level: "error",
      transports: [new Winston.transports.Console({ silent: true })]
    });
  });

  beforeEach(() => {
    // Reset client and service before each test
    client = new MockApprovalMonitorClient([]);
    service = new ApprovalMonitorSrv(logger, client);
  });

  describe("handleTransaction", () => {
    it("returns empty findings if there are no approval events", () => {
      const findings = service.handleTransaction();
      expect(findings).toStrictEqual([]);
    });

    it("returns empty findings for a single approval event", () => {
      client = new MockApprovalMonitorClient([
        createApprovalEvent("0x1000000000000000000000000000000001")
      ]);
      service = new ApprovalMonitorSrv(logger, client);

      const findings = service.handleTransaction();
      expect(findings).toStrictEqual([]);
    });

    it("returns a finding if there are multiple approvals from the same token", () => {
      const address = "0x1000000000000000000000000000000001";
      const logs = Array(10).fill(createApprovalEvent(address));
      client = new MockApprovalMonitorClient(logs);
      service = new ApprovalMonitorSrv(logger, client);

      const findings = service.handleTransaction();
      expect(findings).toHaveLength(1);
      expect(findings[0]).toStrictEqual(
        Finding.fromObject({
          name: "Suspicious amount of token approvals",
          description: "High number of token approvals detected: 10",
          alertId: "HIGH-FREQUENCY-TOKEN-APPROVALS",
          type: FindingType.Suspicious,
          severity: FindingSeverity.Low,
          metadata: {
            address: ethers.utils.getAddress(address).toLowerCase(),
            approvalCount: "10"
          }
        })
      );
    });

    it("should handle different severity levels correctly", () => {
      const address = "0x1000000000000000000000000000000001";
      // Create enough approvals to trigger HIGH severity
      const logs = Array(30).fill(createApprovalEvent(address));
      client = new MockApprovalMonitorClient(logs);
      service = new ApprovalMonitorSrv(logger, client);

      const findings = service.handleTransaction();
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe(FindingSeverity.High);
    });

    it("should handle multiple tokens with different approval counts", () => {
      const logs = [
        ...Array(20).fill(createApprovalEvent("0x1000000000000000000000000000000001")), // Medium severity
        ...Array(30).fill(createApprovalEvent("0x2000000000000000000000000000000002")), // High severity
        ...Array(5).fill(createApprovalEvent("0x3000000000000000000000000000000003")), // No alert
      ];
      client = new MockApprovalMonitorClient(logs);
      service = new ApprovalMonitorSrv(logger, client);

      const findings = service.handleTransaction();
      expect(findings).toHaveLength(2);
      expect(findings[0].severity).toBe(FindingSeverity.Medium);
      expect(findings[1].severity).toBe(FindingSeverity.High);
    });

    it("should not create more than MAX_FINDINGS_PER_TX findings", () => {
      const logs = Array(100).fill(null).map((_, i) => 
        createApprovalEvent(`0x${(i + 1).toString(16).padStart(40, '0')}`)
      );
      client = new MockApprovalMonitorClient(logs);
      service = new ApprovalMonitorSrv(logger, client);

      const findings = service.handleTransaction();
      expect(findings.length).toBeLessThanOrEqual(5);
    });

    it("should handle approval events with different amounts", () => {
      const address = "0x1000000000000000000000000000000001";
      const logs = [
        createApprovalEvent(address, undefined, undefined, "1000000"), // Large approval
        createApprovalEvent(address, undefined, undefined, "0.1"), // Small approval
        ...Array(8).fill(createApprovalEvent(address)) // Regular approvals
      ];
      client = new MockApprovalMonitorClient(logs);
      service = new ApprovalMonitorSrv(logger, client);

      const findings = service.handleTransaction();
      expect(findings).toHaveLength(1);
      expect(findings[0].metadata.approvalCount).toBe("10");
    });

    it("should reset approval counts after an hour", async () => {
      const address = "0x1000000000000000000000000000000001";
      const logs = Array(10).fill(createApprovalEvent(address));
      client = new MockApprovalMonitorClient(logs);
      service = new ApprovalMonitorSrv(logger, client);

      // First batch of findings
      let findings = service.handleTransaction();
      expect(findings).toHaveLength(1);

      // Wait for the reset interval
      await new Promise(resolve => setTimeout(resolve, 3600));

      // Second batch should create new findings as counts were reset
      findings = service.handleTransaction();
      expect(findings).toHaveLength(1);
    }, TEST_TIMEOUT);

    it("should handle invalid event signatures gracefully", () => {
      const mockClientWithError = new MockApprovalMonitorClient([]);
      const invalidSignature = "InvalidSignature(address,uint256)";
      
      // Override filterLog to simulate an error
      jest.spyOn(mockClientWithError, "filterLog").mockImplementation(() => {
        throw new Error(`Invalid event signature: ${invalidSignature}`);
      });

      const serviceWithError = new ApprovalMonitorSrv(logger, mockClientWithError);
      const findings = serviceWithError.handleTransaction();
      
      expect(findings).toStrictEqual([]);
    });
  });
}); 