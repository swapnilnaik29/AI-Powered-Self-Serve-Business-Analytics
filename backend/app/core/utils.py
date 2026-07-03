import json
from datetime import datetime, date
import pandas as pd
import numpy as np

def sanitize_for_json(obj):
    """
    Recursively converts complex objects (Pandas, NumPy, Datetime) 
    into JSON-serializable native Python types.
    """
    if isinstance(obj, dict):
        return {str(k): sanitize_for_json(v) for k, v in obj.items()}
    
    elif isinstance(obj, (list, tuple, set)):
        return [sanitize_for_json(x) for x in obj]
    
    elif pd.api.types.is_scalar(obj) and pd.isna(obj):
        return None
        
    elif isinstance(obj, (datetime, date, pd.Timestamp)):
        return obj.isoformat()
        
    elif isinstance(obj, (np.int_, np.intc, np.intp, np.int8,
                          np.int16, np.int32, np.int64, np.uint8,
                          np.uint16, np.uint32, np.uint64)):
        return int(obj)
        
    elif isinstance(obj, (np.float16, np.float32, np.float64)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
        
    elif isinstance(obj, pd.Series):
        return sanitize_for_json(obj.to_dict())
        
    elif isinstance(obj, pd.DataFrame):
        return sanitize_for_json(obj.to_dict(orient="records"))
        
    else:
        # Fallback to string if strictly not serializable
        try:
            json.dumps(obj)
            return obj
        except (TypeError, OverflowError):
            return str(obj)
