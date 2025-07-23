import { useState, useCallback } from 'react';

export function useSharedState() {
  const [state, setState] = useState({
    design: {},
    version: 0
  });

  const updateDesign = useCallback((updates: any) => {
    setState(prev => ({
      ...prev,
      design: { ...prev.design, ...updates },
      version: prev.version + 1
    }));
  }, []);

  const reset = () => {
    setState({
      design: {},
      version: 0
    });
  };

  return {
    state,
    design: state.design,
    updateDesign,
    reset
  };
}
