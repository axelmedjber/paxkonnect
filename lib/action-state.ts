export type ActionFeedbackState = {
  status: "success" | "error";
  message: string;
};

// Actions may also redirect, in which case they resolve without a state.
export type ActionFeedbackResult = ActionFeedbackState | void;
