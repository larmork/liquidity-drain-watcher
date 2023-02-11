from forta_agent import Finding, FindingType, FindingSeverity, get_transaction_receipt
from apscheduler.schedulers.blocking import BlockingScheduler

HIGH_APPROVAL_PER_HOUR = 25
MEDIUM_APPROVAL_PER_HOUR = 15


findings_count = 0

def provide_handle_transaction(get_transaction_receipt):
    def handle_transaction(transaction_event):
        findings = []
        dict_addresses = {}

        global findings_count
        if findings_count >= 5:
            return findings
        #avoid spamming

        receipt = get_transaction_receipt(transaction_event.hash)
        if receipt.logs.topics == "Approval":
            dict_addresses["{receipt.logs.address}"] += 1
        #create dictionary with data about approvals from each address

        for a in dict_addresses.values():
            if a >= 10:
                address = dict_addresses[a]
                n_approval = a
        #hooking addresses with suspicious amount of approvals

                findings.append(Finding({
                    'name': 'Suspicious amount of token approvals',
                    'description': f'Approved tokens: {n_approval}',
                    'alert_id': 'FORTA-1',
                    'type': FindingType.Suspicious,
                    'severity': get_severity(n_approval),
                    'metadata': {
                        'address': address
                    }
                }))

                def clear_dict():
                    dict_addresses.clear()
                scheduler = BlockingScheduler()
                scheduler.add_job(clear_dict, 'interval', hours=1)
                scheduler.start()
        #clear dictionary every hour to check actual info

                findings_count += len(findings)
                return findings

        return handle_transaction
    
    def get_severity(n_approval):
        if n_approval > HIGH_APPROVAL_PER_HOUR:
            return FindingSeverity.High
        elif n_approval > MEDIUM_APPROVAL_PER_HOUR:
            return FindingSeverity.Medium
        else:
            return FindingSeverity.Low
        #determining the severity for the alert

real_handle_transaction = provide_handle_transaction(get_transaction_receipt)

def handle_transaction(transaction_event):
    return real_handle_transaction(transaction_event)