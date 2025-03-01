import * as promClient from "prom-client";

export class Metrics {
  public ethProviderErrors: promClient.Counter;

  constructor(registry: promClient.Registry, prefix: string = "") {
    this.ethProviderErrors = new promClient.Counter({
      name: prefix + "eth_provider_errors_total",
      help: "Total number of errors encountered while interacting with the ETH provider",
      registers: [registry],
    });
  }
} 