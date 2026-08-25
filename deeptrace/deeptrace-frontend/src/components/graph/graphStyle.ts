

// We extract token values from CSS or hardcode them here since cytoscape needs exact strings.
// A common trick is to use computed styles, but for a deterministic library config, hardcoding matching tokens is easier.
const tokens = {
  tier1: '#378ADD',
  risk: '#D85A30',
  danger: '#E24B4A',
  neutralNode: '#B4B2A9',
  bg: '#FAFAF9',
  border: '#E5E3DE',
  textSecondary: '#6B6A64'
};

export const graphStyle: any[] = [
  {
    selector: 'node',
    style: {
      'background-color': tokens.neutralNode,
      'label': 'data(label)',
      'color': tokens.textSecondary,
      'font-size': '10px',
      'font-family': 'Inter, sans-serif',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 6,
      'text-wrap': 'wrap',
      'text-max-width': '70px',
      'line-height': 1.2,
      'width': 'data(size)',
      'height': 'data(size)',
      'border-width': 2,
      'border-color': tokens.bg,
      // Transition for smooth color changes
      'transition-property': 'background-color, border-color, border-width, width, height',
      'transition-duration': 200
    }
  },
  {
    selector: 'node[tier = 0]',
    style: {
      'background-color': tokens.neutralNode,
    }
  },
  {
    selector: 'node[tier = 1]',
    style: {
      'background-color': tokens.tier1,
    }
  },
  {
    selector: 'node.isRisk',
    style: {
      'background-color': tokens.risk,
      'border-color': tokens.risk,
      'border-width': 4,
    }
  },
  {
    selector: 'node.isDisrupted',
    style: {
      'background-color': tokens.danger,
      'border-color': tokens.danger,
      'border-width': 4,
    }
  },
  {
    selector: 'node.highlight',
    style: {
      'border-width': 4,
      'border-color': '#000'
    }
  },
  {
    selector: 'node.dimmed',
    style: {
      'opacity': 0.3
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 1.5,
      'line-color': tokens.border,
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': tokens.border,
      'opacity': 'data(opacity)', // Derived from confidence
      'transition-property': 'line-color, target-arrow-color, opacity, width',
      'transition-duration': 200
    }
  },
  {
    selector: 'edge.isRisk',
    style: {
      'line-color': tokens.risk,
      'target-arrow-color': tokens.risk,
      'width': 2,
      'opacity': 1,
      'label': 'data(suppliesWhat)',
      'font-size': '10px',
      'font-family': 'Inter, sans-serif',
      'color': tokens.risk,
      'text-background-color': '#fff',
      'text-background-opacity': 0.8,
      'text-background-padding': '2px',
      'text-margin-y': -8
    }
  },
  {
    selector: 'edge.dimmed',
    style: {
      'opacity': 0.1
    }
  }
];
