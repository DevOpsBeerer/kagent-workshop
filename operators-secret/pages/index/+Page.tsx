import { useState } from "react";
import { useData } from "vike-react/useData";
import { Button } from "../../components/Button.js";
import { TextInput } from "../../components/TextInput.js";
import { OperatorCard } from "../../components/OperatorCard.js";
import logoUrl from "../../assets/Logo-APOGOSA.svg";
import type { Data } from "./+data.js";
import "./Dashboard.css";

export default function Page() {
  const { operators } = useData<Data>();
  const [query, setQuery] = useState("");

  function handleViewOperator() {
    const trimmed = query.trim();
    if (!trimmed) return;
    window.location.href = `https://p${trimmed}.workshop.qcs.ovh/`;
  }

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__brand">
          <img src={logoUrl} alt="APOGOSA" className="dashboard__logo" />
          <p className="dashboard__tagline">Operators Identity System</p>
        </div>
        <div className="dashboard__search">
          <TextInput
            className="dashboard__search-input"
            placeholder="Enter Operator ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleViewOperator();
            }}
          />
          <Button onClick={handleViewOperator}>View Operator</Button>
        </div>
      </header>
      <section className="dashboard__grid">
        {operators.map((op) => (
          <OperatorCard key={op.id} id={op.id} secret={op.secret} />
        ))}
      </section>
    </div>
  );
}
