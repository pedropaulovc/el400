import EL400SimulatorV2 from "@/components/v2/EL400SimulatorV2";

const IndexV2 = () => {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-[2vw] bg-[#8a8a70]">
      <h1 className="sr-only">Electronica EL400 Digital Readout Simulator</h1>
      <EL400SimulatorV2 />
      <p className="mt-[1.5vw] text-[0.875rem] text-[#5a5a50] font-medium">
        Click axis buttons to select, then use keypad to enter values
      </p>
    </main>
  );
};

export default IndexV2;
