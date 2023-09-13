// assets
import { IconLayersLinked } from '@tabler/icons';

// constant
const icons = { IconLayersLinked };

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const edges = {
  id: 'edge',
  title: '节点',
  type: 'group',
  children: [
    {
      id: 'default-edge',
      title: '内置节点',
      type: 'item',
      url: '/edges/native-edge',
      icon: icons.IconLayersLinked,
      breadcrumbs: false
    }
  ]
};

export default edges;
