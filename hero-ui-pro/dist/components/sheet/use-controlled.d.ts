export interface UseControlledProps<T = unknown> {
    controlled: T | undefined;
    default: T | undefined;
    onChange?: (newValue: T | ((prevValue: T) => T)) => void;
}
export declare function useControlled<T = unknown>({ controlled, default: defaultProp, onChange, }: UseControlledProps<T>): [T, (newValue: T | ((prevValue: T) => T)) => void];
//# sourceMappingURL=use-controlled.d.ts.map