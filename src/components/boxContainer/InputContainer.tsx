import QueryBoxContainer from './QueryBoxContainer.tsx';
import type { ModeType } from '../boxContainerInput/ModeSelector.tsx';

interface InputContainerProps {
  onModeChange?: (mode: ModeType) => void;
  rotateHint?: boolean;
}

export default function InputContainer({ onModeChange, rotateHint }: InputContainerProps) {
  return (
    <div className="relative">
      <QueryBoxContainer onModeChange={onModeChange} rotateHint={rotateHint} />
    </div>
  );
}