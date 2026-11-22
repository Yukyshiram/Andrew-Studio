import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { UsersRound, ArrowUpRight } from "lucide-react";
import {
  Button,
  Dialog,
  Notice,
} from "../../modern/resources/js/components/ui";
import { useCollection, initialBooks } from "./collection";
import {
  createDemoState,
  executeDemoCommand,
  DemoRuleError,
  PROFILES,
  profileFor,
  type DemoState,
  type DemoCommand,
  type DemoIntent,
  type ProfileId,
} from "./library-domain";

type Action =
  | { type: "command"; command: DemoCommand; activeIds: number[] }
  | { type: "profile"; profileId: ProfileId }
  | { type: "reset" }
  | { type: "dismiss" };
function reducer(state: DemoState, action: Action): DemoState {
  if (action.type === "profile")
    return { ...state, profileId: action.profileId, feedback: null };
  if (action.type === "reset")
    return {
      ...createDemoState(),
      profileId: state.profileId,
    };
  if (action.type === "dismiss") return { ...state, feedback: null };
  try {
    return executeDemoCommand(state, action.command, action.activeIds);
  } catch (error) {
    if (!(error instanceof DemoRuleError)) throw error;
    return {
      ...state,
      feedback: {
        kind: "error",
        message: error.message,
        sequence: (state.feedback?.sequence ?? 0) + 1,
      },
    };
  }
}
interface LibraryContextValue {
  state: DemoState;
  run: (intent: DemoIntent, operationId?: string) => void;
  reset: () => void;
  selectProfile: (profileId: ProfileId) => void;
  openProfiles: () => void;
  dismiss: () => void;
}
const LibraryContext = createContext<LibraryContextValue | null>(null);
export function useDemoLibrary() {
  const value = useContext(LibraryContext);
  if (!value)
    throw new Error("Falta el proveedor de la biblioteca de demostración.");
  return value;
}
export function DemoLibraryProvider({ children }: { children: ReactNode }) {
  const { books, setBooks } = useCollection();
  const [state, dispatch] = useReducer(reducer, undefined, createDemoState);
  const [picker, setPicker] = useState(false);
  const profileTrigger = useRef<HTMLButtonElement>(null);
  const selectProfile = (profileId: ProfileId) => {
    dispatch({ type: "profile", profileId });
    setPicker(false);
  };
  return (
    <LibraryContext.Provider
      value={{
        state,
        run: (intent, operationId = crypto.randomUUID()) =>
          dispatch({
            type: "command",
            command: { ...intent, operationId },
            activeIds: books
              .filter((book) => !book.deleted_at)
              .map((book) => book.id),
          }),
        reset: () => {
          setBooks(structuredClone(initialBooks));
          dispatch({ type: "reset" });
        },
        selectProfile,
        openProfiles: () => setPicker(true),
        dismiss: () => dispatch({ type: "dismiss" }),
      }}
    >
      <ProfileTriggerContext.Provider value={profileTrigger}>
        {children}
      </ProfileTriggerContext.Provider>
      <Dialog
        open={picker}
        onOpenChange={setPicker}
        title="Elige un perfil ficticio"
        description="No es un inicio de sesión. Todos los datos y operaciones son simulaciones en esta pestaña y se reinician al recargar."
        fallbackFocusRef={profileTrigger}
      >
        <div className="demo-profile-list">
          {PROFILES.map((profile) => (
            <button
              key={profile.id}
              type="button"
              aria-pressed={state.profileId === profile.id}
              onClick={() => selectProfile(profile.id)}
            >
              <span>
                <strong>{profile.name}</strong>
                <small>{profile.description}</small>
              </span>
              <ArrowUpRight size={19} aria-hidden="true" />
            </button>
          ))}
        </div>
      </Dialog>
    </LibraryContext.Provider>
  );
}
const ProfileTriggerContext =
  createContext<React.RefObject<HTMLButtonElement | null> | null>(null);
export function ProfilePickerButton() {
  const { state, openProfiles } = useDemoLibrary();
  const ref = useContext(ProfileTriggerContext);
  return (
    <Button
      ref={ref ?? undefined}
      variant="secondary"
      className="demo-profile-trigger"
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true });
        openProfiles();
      }}
      aria-label={`Cambiar perfil ficticio: ${profileFor(state).name}`}
    >
      <UsersRound size={17} aria-hidden="true" />
      <span>{profileFor(state).name}</span>
    </Button>
  );
}
export function DemoFeedback() {
  const { state, dismiss } = useDemoLibrary();
  return (
    <div className="demo-feedback">
      {state.feedback && (
        <Notice kind={state.feedback.kind}>
          <span>{state.feedback.message}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismiss}
            aria-label="Cerrar aviso"
          >
            Cerrar
          </Button>
        </Notice>
      )}
    </div>
  );
}
export function ProfileInvitation({
  staff = false,
  admin = false,
}: {
  staff?: boolean;
  admin?: boolean;
}) {
  const { openProfiles } = useDemoLibrary();
  return (
    <section
      className="panel demo-profile-invitation"
      aria-label="Selección de perfil"
    >
      <p className="eyebrow">MODO DEMOSTRACIÓN</p>
      <h2>
        {staff
          ? "Explora el otro lado del mostrador"
          : "Tu próximo libro empieza aquí"}
      </h2>
      <p>
        {staff
          ? `Elige ${admin ? "Andrea · Administración" : "Mateo · Biblioteca o Andrea · Administración"} para probar estas operaciones ficticias.`
          : "Elige Lucía o Nora para explorar una cuenta ficticia, solicitar libros y consultar tus fechas."}{" "}
        No se crean cuentas ni se autentican personas.
      </p>
      <Button
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          openProfiles();
        }}
      >
        <UsersRound size={17} aria-hidden="true" />
        Elegir perfil ficticio
      </Button>
    </section>
  );
}
