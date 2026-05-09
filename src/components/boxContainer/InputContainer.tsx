import QueryBoxContainer from './QueryBoxContainer.tsx';
import type { ModeType } from '../boxContainerInput/ModeSelector.tsx';

interface InputContainerProps {
  onModeChange?: (mode: ModeType) => void;
}

export default function InputContainer({ onModeChange }: InputContainerProps) {
  return (
    <div className="relative">
      <QueryBoxContainer onModeChange={onModeChange} />
    </div>
  );
}