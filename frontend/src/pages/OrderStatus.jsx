import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import './OrderStatus.css';

const OrderStatus = () => {
  const { currentOrder } = useAppContext();
  const [sagaData, setSagaData] = useState(null);

  useEffect(() => {
    if (!currentOrder || !currentOrder.sagaId) return;
    
    // Poll the orchestrator for saga status
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/sagas/${currentOrder.sagaId}`);
        const data = await res.json();
        setSagaData(data);
        
        if (data.status === 'COMPLETED' || data.status === 'COMPENSATED' || data.status === 'FAILED') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Failed to fetch saga", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [currentOrder]);

  if (!currentOrder) {
    return <Navigate to="/" />;
  }

  const isFailureFlow = currentOrder.isFailureFlow;
  
  // Mapping history to UI Stepper
  const allPossibleSteps = [
    { key: 'SAGA_STARTED', title: 'Saga Started', service: 'orchestrator' },
    { key: 'ORDER_CREATED', title: 'Order Created', service: 'order-service' },
    { key: 'INVENTORY_RESERVED', title: 'Inventory Reserved', service: 'inventory-service' },
    { key: 'PAYMENT_COMPLETED', title: 'Payment Processed', service: 'payment-service' },
    { key: 'SHIPPING_CREATED', title: 'Shipment Created', service: 'shipping-service' },
    { key: 'ORDER_CONFIRMED', title: 'Order Completed', service: 'order-service' },
    // Compensation steps:
    { key: 'PAYMENT_REFUNDED', title: 'Payment Refunded', service: 'payment-service', isComp: true },
    { key: 'INVENTORY_RELEASED', title: 'Inventory Released', service: 'inventory-service', isComp: true },
    { key: 'ORDER_CANCELLED', title: 'Order Cancelled', service: 'order-service', isComp: true },
    { key: 'SAGA_ROLLED_BACK', title: 'Saga Rolled Back', service: 'orchestrator', isComp: true }
  ];

  const history = sagaData ? sagaData.history : [];
  
  // We only show steps that have been reached, plus the current "processing/failing" step if any
  const displayedSteps = allPossibleSteps.filter(step => {
    // Show if it's in history
    if (history.includes(step.key)) return true;
    
    // Show the next logical step as "pending/processing"
    // Success path logic
    if (!sagaData) return step.key === 'SAGA_STARTED';
    
    if (sagaData.status === 'RUNNING' && !isFailureFlow) {
      const nextExpected = allPossibleSteps.find(s => !history.includes(s.key) && !s.isComp);
      if (nextExpected && step.key === nextExpected.key) return true;
    }
    
    return false;
  });

  // If a failure happens, we inject an error step dynamically based on what failed
  const failedStepMsg = sagaData && sagaData.errorMessage ? sagaData.errorMessage : "Failed Step";
  if (sagaData && (sagaData.status === 'COMPENSATING' || sagaData.status === 'FAILED' || sagaData.status === 'COMPENSATED')) {
    // ensure we inject the error right after the last normal success step
    const hasErrorPushed = displayedSteps.find(s => s.isError);
    if (!hasErrorPushed) {
      // Find the first compensation step index or just push at the end of normal steps
      const compIndex = displayedSteps.findIndex(s => s.isComp);
      const insertAt = compIndex !== -1 ? compIndex : displayedSteps.length;
      displayedSteps.splice(insertAt, 0, {
        key: 'ERROR_STATE',
        title: 'Failure Detected',
        service: 'orchestrator',
        isError: true,
        desc: failedStepMsg
      });
    }
  }

  const isComplete = sagaData && (sagaData.status === 'COMPLETED' || sagaData.status === 'COMPENSATED');

  return (
    <div className="status-container pb-8">
      <div className="status-header card mb-4">
        <h2>Order Status</h2>
        <div className="order-meta">
          <p><strong>Saga ID:</strong> {currentOrder.sagaId}</p>
          <p><strong>Order ID:</strong> {currentOrder.orderId || 'Pending...'}</p>
          <p><strong>Total Amount:</strong> ${currentOrder.total.toLocaleString()}</p>
          <p><strong>Status:</strong> <span style={{fontWeight:'bold'}}>{sagaData ? sagaData.status : 'INITIALIZING'}</span></p>
        </div>
      </div>

      <div className="saga-visualizer card">
        <h3 className="section-title">Saga Orchestrator Timeline</h3>
        <p className="subtitle">Polling /sagas/{currentOrder.sagaId} from backend</p>
        
        <div className="stepper">
          {displayedSteps.map((step, index) => {
             const isLastReached = history.includes(step.key) && index === displayedSteps.length - 1 && sagaData?.status === 'RUNNING';
             const isProcessingNode = !history.includes(step.key) && !step.isError;
             const isPastNode = history.includes(step.key) || isComplete || step.isError;
             
             let stepClass = 'step past';
             if (isProcessingNode || isLastReached) stepClass = 'step active';
             if (step.isError) stepClass = 'step has-error';
             if (step.isComp) stepClass = 'step is-compensation';

             const renderIcon = () => {
               if (step.isError) return <XCircle className="icon-error" size={28} />;
               if (step.isComp) return <AlertCircle className="icon-compensation" size={28} />;
               if (isProcessingNode || isLastReached) return <Clock className="icon-processing pulse" size={28} />;
               return <CheckCircle2 className="icon-success" size={28} />;
             };

             return (
               <div key={step.key} className={stepClass}>
                 <div className="step-indicator">
                   {renderIcon()}
                   {index < displayedSteps.length - 1 && <div className="step-line" />}
                 </div>
                 <div className="step-content">
                   <h4 className="step-title">{step.title}</h4>
                   <div className="service-badge">{step.service}</div>
                   {step.desc && <p className="step-desc">{step.desc}</p>}
                 </div>
               </div>
             );
          })}
        </div>

        {isComplete && (
          <div className="saga-completion text-center mt-8">
            <h3 className={isFailureFlow ? 'text-error' : 'text-success'}>
              {isFailureFlow ? 'Saga Rolled Back Successfully' : 'Saga Completed Successfully'}
            </h3>
            <Link to="/" className="btn-primary mt-4">Return to Home</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStatus;
