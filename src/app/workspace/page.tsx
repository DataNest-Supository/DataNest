import AuthGate from "@/components/AuthGate";

export const metadata={
  title:"Workspace",
  description:"Secure DataNest workspace sign-in and governed operating environment.",
  robots:{index:false,follow:false}
};

export default function Workspace(){
  return <AuthGate />;
}
