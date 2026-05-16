import { Modal } from "./Modal.js";
import { Button } from "./Button.js";
import { TextInput } from "./TextInput.js";
import "./OperatorDetailModal.css";

export type OperatorDetailModalProps = {
  open: boolean;
  onClose: () => void;
  operatorId: string | number;
  secret: string;
};

export function OperatorDetailModal({
  open,
  onClose,
  operatorId,
  secret,
}: OperatorDetailModalProps) {
  const inputId = `operator-${operatorId}-secret`;
  const consoleUrl = `https://p${operatorId}.workshop.qcs.ovh/`;

  function handleAccess() {
    window.location.href = consoleUrl;
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel={`Operator ${operatorId} details`}>
      <header className="ds-operator-detail__header">
        <h2 className="ds-operator-detail__title">OPERATOR {operatorId}</h2>
        <p className="ds-operator-detail__subtitle">Identity Detail</p>
      </header>
      <div className="ds-operator-detail__body">
        <label className="ds-operator-detail__label" htmlFor={inputId}>
          Access Password
        </label>
        <TextInput
          id={inputId}
          className="ds-operator-detail__secret"
          value={secret}
          readOnly
        />
        <Button className="ds-operator-detail__access" onClick={handleAccess}>
          &gt;&gt;&gt; ACCESS OPERATOR ENVIRONMENT &lt;&lt;&lt;
        </Button>
      </div>
    </Modal>
  );
}
