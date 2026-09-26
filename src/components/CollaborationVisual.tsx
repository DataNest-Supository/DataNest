export default function CollaborationVisual() {
  return <div className="aiICoreStage" aria-label="AI and human collaboration visualization">
        <div className="coreOrbit orbitOuter" aria-hidden="true"/>
        <div className="coreOrbit orbitMiddle" aria-hidden="true"/>
        <div className="signalArc arcOne" aria-hidden="true"/>
        <div className="signalArc arcTwo" aria-hidden="true"/>
        <div className="coreNode humanCore">
          <small>I</small>
          <strong>Intent</strong>
          <span>Human direction</span>
        </div>
        <div className="coreBridge" aria-hidden="true">
          <i className="intentFlowPacket packetA"/>
          <i className="intentFlowPacket packetB"/>
          <i className="amplifyFlowPacket"/>
          <i className="feedbackFlowPacket"/>
        </div>
        <div className="coreNode aiCore">
          <small>AI</small>
          <strong>Amplify</strong>
          <span>Governed intelligence</span>
        </div>
        <div className="coreCenter" aria-hidden="true"><span>R</span></div>
        <div className="resonanceRipple" aria-hidden="true"/>
        <span className="coreCaption">Traceable collaboration loop</span>
      </div>;
}
