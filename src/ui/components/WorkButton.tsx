type WorkButtonProps = {
  onWork: () => void;
};

const WorkButton = ({ onWork }: WorkButtonProps) => {
  return (
    <div className="work-section">
      <button className="work-button" onClick={onWork} type="button">
        WORK
      </button>
      <div className="work-subtext">+$0.25 per tap</div>
      <div className="work-bonus">Bonus every 20 taps: +$2</div>
    </div>
  );
};

export default WorkButton;