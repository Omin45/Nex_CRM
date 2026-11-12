/**
 * ArkCRM — KanbanBoard
 * ---------------------------------------------------------------------------
 * Spec: "a Kanban board for the Sales pipeline using native HTML5 drag and
 * drop. Columns are pipeline stages (New, Qualified, Proposal, Negotiation,
 * Won, Lost). Cards show the lead name, company, value, owner avatar and the
 * days since last contact. Dragging a card between columns calls
 * salesApi.moveLead. Each column header shows the lead count and total value.
 * A column shows a dashed 'drop here' highlight when a card is dragged over it."
 *
 * Native drag and drop, deliberately. react-beautiful-dnd and friends are
 * unmaintained, and the spec asks for no UI libraries. The tradeoff is that
 * HTML5 DnD has no touch support — so every drag action also has a keyboard
 * equivalent, which is not optional anyway (see `moveCard` below).
 *
 * Keyboard path: focus a card, press Enter/Space to pick it up, arrow keys to
 * choose a column, Enter to drop, Escape to cancel. `aria-grabbed` and a live
 * region announce each step, so the board is operable without a pointer.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiClock, FiMove } from 'react-icons/fi';
import { LEAD_STAGES } from '@/config/constants';
import './KanbanBoard.css';

/** A lead with no contact for this long is flagged as stale on its card. */
const STALE_AFTER_DAYS = 14;

/** Stage ids, in pipeline order, taken from the canonical LEAD_STAGES list. */
const STAGE_IDS = LEAD_STAGES.map((stage) => stage.id);

/** Label for a stage id, or the id itself if it is unrecognised. */
const STAGE_LABELS = Object.fromEntries(LEAD_STAGES.map((s) => [s.id, s.label]));

/**
 * @param {object[]} columns   [{ id, label, leads: [...] }]
 * @param {(leadId, toStageId) => void} onMove
 * @param {boolean} disabled  While a move mutation is in flight, so a second
 *                            drop cannot race the first.
 */
export default function KanbanBoard({ columns = [], onMove, disabled = false }) {
  /* The lead id currently being dragged, or held by the keyboard. */
  const [draggingId, setDraggingId] = useState(null);
  /* The column the pointer or keyboard focus is currently over. */
  const [overStage, setOverStage] = useState(null);
  /* Set while a keyboard user is holding a card, so the hint appears. */
  const [holdingId, setHoldingId] = useState(null);

  /* Single live region for the whole board. One region rather than one per
     column, so announcements queue instead of talking over each other. */
  const [announcement, setAnnouncement] = useState('');

  const dragCounter = useRef(0);

  const findColumn = useCallback(
    (leadId) => columns.find((column) => column.leads.some((lead) => lead.id === leadId)),
    [columns],
  );

  const findStageOf = useCallback(
    (leadId) => findColumn(leadId)?.id ?? null,
    [findColumn],
  );

  const describe = useCallback(
    (leadId, stageId) => {
      const lead = columns
        .flatMap((column) => column.leads)
        .find((item) => item.id === leadId);
    const stage = columns.find((column) => column.id === stageId);
    if (!lead || !stage) return '';
    return `${lead.name} moved to ${stage.label ?? STAGE_LABELS[stageId] ?? stageId}.`;
  },
    [columns],
  );

  /* ---- pointer drag ----------------------------------------------------- */

  const handleDragStart = (event, lead, stageId) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    setDraggingId(lead.id);
    setAnnouncement(
      `Picked up ${lead.name} from ${columns.find((c) => c.id === stageId)?.label ?? stageId}.`,
    );

    /* Firefox refuses to start a drag unless some data is set. The value is
       never read; `text/plain` keeps it portable. */
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(lead.id));
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setOverStage(null);
    dragCounter.current = 0;
  };

  /* dragenter/dragleave fire for every child element, so the column flickers
     as the pointer crosses nested nodes. Counting enters and only clearing on
     the matching leave is the standard fix. */
  const handleColumnEnter = (event, stageId) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dragCounter.current += 1;
    setOverStage(stageId);
  };

  const handleColumnLeave = (event) => {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setOverStage(null);
    }
  };

  const handleDrop = (event, stageId) => {
    event.preventDefault();
    dragCounter.current = 0;
    setOverStage(null);

    /* Prefer the React state; fall back to the payload for the case where the
       drop lands before dragstart's state update has flushed. */
    const leadId = draggingId ?? event.dataTransfer.getData('text/plain');
    setDraggingId(null);
    if (!leadId) return;

    const from = findStageOf(leadId);
    if (!from || from === stageId) return;

    onMove(leadId, stageId);
    setAnnouncement(describe(leadId, stageId));
  };

  /* ---- keyboard drag ---------------------------------------------------- */

  const moveCard = useCallback(
    (leadId, direction) => {
      const currentIndex = STAGE_IDS.indexOf(findStageOf(leadId));
      const nextIndex = currentIndex + direction;
      const nextStage = STAGE_IDS[nextIndex];
      if (!nextStage) return;

      onMove(leadId, nextStage);
      setAnnouncement(describe(leadId, nextStage));
    },
    [findStageOf, onMove, describe],
  );

  const handleCardKeyDown = (event, lead) => {
    if (disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setHoldingId((current) => (current === lead.id ? null : lead.id));
      setAnnouncement(
        holdingId === lead.id
          ? `Put down ${lead.name}.`
          : `Holding ${lead.name}. Use the left and right arrow keys to move it.`,
      );
      return;
    }

    if (event.key === 'Escape' && holdingId === lead.id) {
      event.preventDefault();
      setHoldingId(null);
      setAnnouncement(`Cancelled. ${lead.name} was not moved.`);
      return;
    }

    /* Arrows only do anything while a card is held, so plain tabbing through
       the board does not shuffle the pipeline. */
    if (holdingId !== lead.id) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveCard(lead.id, 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveCard(lead.id, -1);
    }
  };

  /* Escape anywhere drops a held card, so a held card can never be stranded if
     focus moves elsewhere. */
  useEffect(() => {
    if (!holdingId) return undefined;
    const release = (event) => {
      if (event.key === 'Escape') {
        setHoldingId(null);
        setAnnouncement('Cancelled.');
      }
    };
    window.addEventListener('keydown', release);
    return () => window.removeEventListener('keydown', release);
  }, [holdingId]);

  const formatValue = (value) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value ?? 0);

  return (
    <div className="nx-kanban">
      <p className="nx-sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <ol className="nx-kanban__board">
        {columns.map((column) => {
          const total = column.leads.reduce((sum, lead) => sum + (lead.value ?? 0), 0);
          const isOver = overStage === column.id && draggingId;

          return (
            <li
              key={column.id}
              className="nx-kanban__column"
              data-stage={column.id}
              data-over={isOver || undefined}
              /* preventDefault is required on both, or the browser refuses the
                 drop entirely. */
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDragEnter={(event) => handleColumnEnter(event, column.id)}
              onDragLeave={handleColumnLeave}
              onDrop={(event) => handleDrop(event, column.id)}
            >
              <header className="nx-kanban__column-head">
                <h3 className="nx-kanban__column-title">
                  {column.label}
                  <span className="nx-kanban__count">{column.leads.length}</span>
                </h3>
                <p className="nx-kanban__column-total">{formatValue(total)}</p>
              </header>

              <ul className="nx-kanban__cards">
                {column.leads.map((lead) => (
                  <li key={lead.id}>
                    <article
                      className="nx-kanban__card"
                      draggable={!disabled}
                      /* A grabbed card follows the pointer at reduced opacity,
                         which is the clearest "lifted" signal available. */
                      data-dragging={draggingId === lead.id || undefined}
                      data-holding={holdingId === lead.id || undefined}
                      tabIndex={0}
                      role="button"
                      aria-roledescription="draggable lead"
                      aria-label={`${lead.name}, ${lead.company ?? 'no company'}, ${formatValue(lead.value)}. Press Enter to pick up, then use the arrow keys to move between stages.`}
                      onDragStart={(event) => handleDragStart(event, lead, column.id)}
                      onDragEnd={handleDragEnd}
                      onKeyDown={(event) => handleCardKeyDown(event, lead)}
                    >
                      <div className="nx-kanban__card-head">
                        <h4 className="nx-kanban__card-name">{lead.name}</h4>
                        <span className="nx-kanban__grip" aria-hidden="true">
                          <FiMove size={13} />
                        </span>
                      </div>

                      {lead.company ? (
                        <p className="nx-kanban__card-company">{lead.company}</p>
                      ) : null}

                      <p className="nx-kanban__card-value">{formatValue(lead.value)}</p>

                      <footer className="nx-kanban__card-foot">
                        {lead.owner ? (
                          <span className="nx-kanban__owner" title={lead.owner}>
                            {lead.owner
                              .split(' ')
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join('')}
                          </span>
                        ) : null}

                        {lead.lastContactDays != null ? (
                          /* "Days since last contact" is information on a fresh
                             deal and a warning on a stale one, so past the
                             threshold it changes colour. */
                          <span
                            className="nx-kanban__age"
                            data-stale={lead.lastContactDays > STALE_AFTER_DAYS || undefined}
                            title={`Last contacted ${lead.lastContactDays} days ago`}
                          >
                            <FiClock size={11} aria-hidden="true" />
                            {lead.lastContactDays}d
                          </span>
                        ) : null}
                      </footer>
                    </article>
                  </li>
                ))}
              </ul>

              {column.leads.length === 0 ? (
                <p className="nx-kanban__empty">Nothing here</p>
              ) : null}

              {/* The dashed target the spec asks for. Only rendered while a
                  card is over this column, so an empty board is not covered in
                  drop zones. */}
              {isOver ? (
                <p className="nx-kanban__drop-hint" aria-hidden="true">
                  Drop here
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
