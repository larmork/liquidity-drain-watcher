# Liquidity Drain Watcher

## Description

This Forta agent monitors for suspicious token approval patterns that might indicate potential liquidity drain attempts. It detects high frequency of approvals from the same token contract which could be a sign of malicious activity.

## Features

- Monitors token approval events
- Detects high frequency of approvals from the same token contract
- Configurable thresholds for different severity levels
- Real-time alerts for suspicious patterns

## Supported Chains

- Holesky (Ethereum testnet)
- Ethereum mainnet (planned for future deployment)

## Alerts

- HIGH-FREQUENCY-TOKEN-APPROVALS
  - Fired when a token contract has suspicious number of approvals within an hour
  - Severity is dynamic based on the number of approvals:
    - HIGH: > 25 approvals per hour
    - MEDIUM: > 15 approvals per hour
    - LOW: > 10 approvals per hour
  - Type is always set to "suspicious"
  - Includes metadata about the token contract address and approval count

## Installation

```bash
npm install
```

## Running Tests

```bash
npm test
```

## Running the Agent

```bash
# Build TypeScript
npm run build

# Run in development mode
npm run start:dev

# Run in production mode
npm run start:prod
```

## Configuration

The agent has configurable thresholds in `src/agent.ts`:

- `HIGH_APPROVAL_PER_HOUR`: Number of approvals per hour to trigger high severity alert (default: 25)
- `MEDIUM_APPROVAL_PER_HOUR`: Number of approvals per hour to trigger medium severity alert (default: 15)
- `MAX_FINDINGS_PER_TX`: Maximum number of findings to return per transaction (default: 5)

## License

This project is licensed under the MIT License.
