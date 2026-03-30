import { useEffect } from "react";
import { createChatWidget } from "../services/chatWidget";

export default function DemoPage() {
  useEffect(() => {
    const chatWidget = createChatWidget({
      scriptId: "qaDvYRRCydCd26jRsiJ6H",
      defaultConfig: {
        closeOnClickOutside: true,
      },
      removeInjectedDomOnDestroy: true,
      playOnlyWhenMinimized: false,
    });

    chatWidget.init();

    return () => {
      chatWidget.destroy({ removeScript: true, removeDom: true, resetGlobal: true });
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center" style={{backgroundColor: 'var(--secondary-bg)'}}>
      <div className="text-center">
        <p className="text-sm" style={{color: 'var(--secondary-text)'}}>
          The chatbot widget will appear in the bottom right corner
        </p>
      </div>
    </div>
  );
}
