import {
  Finding,
  HandleTransaction,
  TransactionEvent,
} from "forta-agent";
import * as Winston from "winston";
import * as promClient from "prom-client";
import { ApprovalMonitorSrv } from "./services/ApprovalMonitor.srv";
import { ETHProvider } from "./clients/eth_provider";
import { Metrics } from "./utils/metrics";

// Initialize logger
const logger = Winston.createLogger({
  level: "info",
  format: Winston.format.simple(),
  transports: [new Winston.transports.Console()],
});

// Initialize metrics
const registry = new promClient.Registry();
const metrics = new Metrics(registry);

const handleTransaction: HandleTransaction = async (txEvent: TransactionEvent) => {
  const ethProvider = new ETHProvider(logger, metrics, txEvent);
  const approvalMonitor = new ApprovalMonitorSrv(logger, ethProvider);
  return approvalMonitor.handleTransaction();
};

export default {
  handleTransaction,
}; 