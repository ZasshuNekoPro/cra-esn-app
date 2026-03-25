import { CraStatus } from '@esn/shared-types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MonthStatusTimelineProps {
  status: string;
  signedByEmployeeAt: string | null;
  signedByEsnAt: string | null;
  signedByClientAt: string | null;
  rejectionComment: string | null;
}

interface Step {
  key: string;
  label: string;
  signedAt: string | null;
  requiredStatuses: string[];
}

const STEPS: Step[] = [
  {
    key: 'employee',
    label: 'Salarié',
    signedAt: null,
    requiredStatuses: [
      CraStatus.SIGNED_EMPLOYEE,
      CraStatus.SIGNED_ESN,
      CraStatus.SIGNED_CLIENT,
      CraStatus.LOCKED,
    ],
  },
  {
    key: 'esn',
    label: 'ESN',
    signedAt: null,
    requiredStatuses: [
      CraStatus.SIGNED_ESN,
      CraStatus.SIGNED_CLIENT,
      CraStatus.LOCKED,
    ],
  },
  {
    key: 'client',
    label: 'Client',
    signedAt: null,
    requiredStatuses: [CraStatus.SIGNED_CLIENT, CraStatus.LOCKED],
  },
];

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy', { locale: fr });
  } catch {
    return null;
  }
}

export function MonthStatusTimeline({
  status,
  signedByEmployeeAt,
  signedByEsnAt,
  signedByClientAt,
  rejectionComment,
}: MonthStatusTimelineProps): JSX.Element {
  const steps = [
    { ...STEPS[0], signedAt: signedByEmployeeAt },
    { ...STEPS[1], signedAt: signedByEsnAt },
    { ...STEPS[2], signedAt: signedByClientAt },
  ];

  const craStatus = status as CraStatus;
  const isRejected =
    rejectionComment !== null &&
    (craStatus === CraStatus.DRAFT || craStatus === CraStatus.SUBMITTED);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ol className="flex w-full items-center">
          {steps.map((step, index) => {
            const isSigned = step.requiredStatuses.includes(status);
            const isPending = !isSigned;
            const formattedDate = formatDate(step.signedAt);

            return (
              <li
                key={step.key}
                className={`flex flex-1 flex-col items-center ${index < steps.length - 1 ? 'relative' : ''}`}
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-0.5 ${
                      isSigned ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                    aria-hidden="true"
                  />
                )}

                {/* Circle indicator */}
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    isSigned
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}
                  aria-label={isSigned ? `${step.label} — signé` : `${step.label} — en attente`}
                >
                  {isSigned ? '✓' : ''}
                </div>

                {/* Step label */}
                <span
                  className={`mt-2 text-xs font-medium ${
                    isSigned ? 'text-green-700' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>

                {/* Signature date */}
                {formattedDate && (
                  <span className="mt-0.5 text-xs text-gray-400">{formattedDate}</span>
                )}

                {/* Pending label */}
                {isPending && (
                  <span className="mt-0.5 text-xs text-gray-400 italic">En attente</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* DRAFT notice */}
      {craStatus === CraStatus.DRAFT && !isRejected && (
        <p className="text-xs text-gray-400 italic">CRA non encore soumis</p>
      )}

      {/* Rejection comment */}
      {isRejected && rejectionComment && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-700">Motif de rejet :</p>
          <p className="mt-1 text-sm text-red-600">{rejectionComment}</p>
        </div>
      )}
    </div>
  );
}
