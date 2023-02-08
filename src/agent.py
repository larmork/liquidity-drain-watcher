from forta_agent import Finding, FindingType, FindingSeverity

TRANSFER_EVENT = '{"name":"Transfer","type":"event","anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}]}'
HIGH_APPROVAL_PER_HOUR = 20
MEDIUM_APPROVAL_PER_HOUR = 10


findings_count = 0
n_approval = 0


def handle_transaction(transaction_event):
    findings = []

    global findings_count
    if findings_count >= 5:
        return findings


    receipt = get_transaction_receipt(transaction_event.hash)
    if receipt.name = "Approval":
        n_approval += 1

    if n_approval >= MAX_APPROVAL_PER_HOUR:


        findings.append(Finding({
            'name': 'Suspicious amount of token approvals',
            'description': f'Approved tokens: {n_appproval}',
            'alert_id': 'FORTA-1',
            'type': FindingType.Suspicious,
            'severity': get_severity(n_approval),
            'metadata': {
              
            }
        }))
        findings_count += len(findings)
        return findings
    
    def get_severity(n_approval):
    if n_approval > HIGH_APPROVAL_PER_HOUR:
        return FindingSeverity.High
    elif n_approval > MEDIUM_APPROVAL_PER_HOUR:
        return FindingSeverity.Medium
    else:
        return FindingSeverity.Low


