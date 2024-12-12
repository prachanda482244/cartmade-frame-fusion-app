import React from "react";

interface InputColorProps {
  title: string;
  value: string;
  setState: React.Dispatch<React.SetStateAction<string>>;
  flag?: string;
}

const InputColorPicker: React.FC<InputColorProps> = ({
  title,
  value,
  setState,
  flag,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState(event.target.value);
  };

  return (
    <div>
      <div className="flex items-center gap-2 py-2  border-[#ccc] ">
        {flag === "hotspot" ? (
          <div className=" flex items-center justify-between gap-2">
            <h2>{title}</h2>
            <input
              type="color"
              className="w-8 h-8  bg-transparent rounded-[4px] border border-[#ccc] "
              value={value}
              onChange={handleChange}
            />
          </div>
        ) : (
          <>
            <h2 className="w-1/2">{title}</h2>
            <input
              type="color"
              className="w-8 h-8  bg-transparent rounded-[4px] border border-[#ccc] "
              value={value}
              onChange={handleChange}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default InputColorPicker;
