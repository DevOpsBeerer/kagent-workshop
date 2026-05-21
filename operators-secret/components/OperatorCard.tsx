import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { Button } from "./Button.js";
import { OperatorDetailModal } from "./OperatorDetailModal.js";
import "./OperatorCard.css";

export type OperatorCardProps = {
  id: string | number;
  secret?: string;
  onViewDetails?: () => void;
  className?: string;
};

export function OperatorCard({ id, secret = "", onViewDetails, className }: OperatorCardProps) {
  const [open, setOpen] = useState(false);
  const consoleUrl = `https://p${id}.kagent-devopsdays.ch/`;
  const classes = ["ds-operator-card", className].filter(Boolean).join(" ");

  function handleViewDetails() {
    onViewDetails?.();
    setOpen(true);
  }

  return (
    <article className={classes}>
      <div className="ds-operator-card__frame">
        <span className="ds-operator-card__corners" aria-hidden="true" />
        <FontAwesomeIcon icon={faUser} className="ds-operator-card__icon" />
      </div>
      <h3 className="ds-operator-card__title">Operator {id}</h3>
      <a className="ds-operator-card__link" href={consoleUrl} target="_blank" rel="noreferrer">
        {consoleUrl}
      </a>
      <Button size="sm" onClick={handleViewDetails}>
        View Details
      </Button>
      <OperatorDetailModal
        open={open}
        onClose={() => setOpen(false)}
        operatorId={id}
        secret={secret}
      />
    </article>
  );
}
