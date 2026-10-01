import './styles.css';

export interface StepperProps {
  steps: string[];
  current: number;
}

/**
 * Stepper — visual progress. aria-current=step on the active item.
 */
export function Stepper(props: StepperProps) {
  const { steps, current } = props;
  return (
    <ol className="ff-stepper" aria-label="İlerleme">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <li
            key={s}
            className={`ff-stepper__item ff-stepper__item--${state}`}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span aria-hidden="true" className="ff-stepper__indicator">
              {i + 1}
            </span>
            <span className="ff-stepper__label">{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
