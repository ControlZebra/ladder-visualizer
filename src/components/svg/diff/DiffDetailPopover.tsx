export interface DiffDetailPopoverProps {
  oldText: string;
  newText: string;
}

export function DiffDetailPopover({ oldText, newText }: DiffDetailPopoverProps) {
  return <title>{`Old: ${oldText}\nNew: ${newText}`}</title>;
}

export default DiffDetailPopover;