export interface ClientsLoadingState {
  initial: boolean;
  searching: boolean;
  filtering: boolean;
  paginating: boolean;
  submitting: boolean;
  deleting: string | null;
}

export interface LoadingStateActions {
  setInitialLoading: (loading: boolean) => void;
  setSearchingLoading: (loading: boolean) => void;
  setFilteringLoading: (loading: boolean) => void;
  setPaginatingLoading: (loading: boolean) => void;
  setSubmittingLoading: (loading: boolean) => void;
  setDeletingLoading: (clientId: string | null) => void;
}

export type LoadingStateKey = keyof Omit<ClientsLoadingState, 'deleting'>;