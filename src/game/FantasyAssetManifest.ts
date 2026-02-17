export interface FantasyAsset {
    id: string;
    path: string;
    width: number;
    height: number;
    type: 'building' | 'prop' | 'tree' | 'bush';
}

export const FantasyAssetManifest: FantasyAsset[] = [
    // BUILDINGS
    { id: 'building-CityWall_Gate_1', path: 'assets/fantasy/Art/Buildings/CityWall_Gate_1.png', width: 80, height: 96, type: 'building' },
    { id: 'building-House_Hay_1', path: 'assets/fantasy/Art/Buildings/House_Hay_1.png', width: 89, height: 91, type: 'building' },
    { id: 'building-House_Hay_2', path: 'assets/fantasy/Art/Buildings/House_Hay_2.png', width: 157, height: 112, type: 'building' },
    { id: 'building-House_Hay_3', path: 'assets/fantasy/Art/Buildings/House_Hay_3.png', width: 175, height: 128, type: 'building' },
    { id: 'building-House_Hay_4_Purple', path: 'assets/fantasy/Art/Buildings/House_Hay_4_Purple.png', width: 128, height: 128, type: 'building' },
    { id: 'building-Well_Hay_1', path: 'assets/fantasy/Art/Buildings/Well_Hay_1.png', width: 56, height: 74, type: 'building' },

    // PROPS
    { id: 'prop-Banner_Stick_1_Purple', path: 'assets/fantasy/Art/Props/Banner_Stick_1_Purple.png', width: 24, height: 59, type: 'prop' },
    { id: 'prop-Barrel_Small_Empty', path: 'assets/fantasy/Art/Props/Barrel_Small_Empty.png', width: 16, height: 20, type: 'prop' },
    { id: 'prop-Basket_Empty', path: 'assets/fantasy/Art/Props/Basket_Empty.png', width: 22, height: 17, type: 'prop' },
    { id: 'prop-Bench_1', path: 'assets/fantasy/Art/Props/Bench_1.png', width: 14, height: 30, type: 'prop' },
    { id: 'prop-Bench_3', path: 'assets/fantasy/Art/Props/Bench_3.png', width: 14, height: 14, type: 'prop' },
    { id: 'prop-BulletinBoard_1', path: 'assets/fantasy/Art/Props/BulletinBoard_1.png', width: 44, height: 42, type: 'prop' },
    { id: 'prop-Chopped_Tree_1', path: 'assets/fantasy/Art/Props/Chopped_Tree_1.png', width: 32, height: 31, type: 'prop' },
    { id: 'prop-Crate_Large_Empty', path: 'assets/fantasy/Art/Props/Crate_Large_Empty.png', width: 24, height: 29, type: 'prop' },
    { id: 'prop-Crate_Medium_Closed', path: 'assets/fantasy/Art/Props/Crate_Medium_Closed.png', width: 16, height: 21, type: 'prop' },
    { id: 'prop-Crate_Water_1', path: 'assets/fantasy/Art/Props/Crate_Water_1.png', width: 30, height: 22, type: 'prop' },
    { id: 'prop-Fireplace_1', path: 'assets/fantasy/Art/Props/Fireplace_1.png', width: 30, height: 26, type: 'prop' },
    { id: 'prop-HayStack_2', path: 'assets/fantasy/Art/Props/HayStack_2.png', width: 29, height: 32, type: 'prop' },
    { id: 'prop-LampPost_3', path: 'assets/fantasy/Art/Props/LampPost_3.png', width: 46, height: 62, type: 'prop' },
    { id: 'prop-Plant_2', path: 'assets/fantasy/Art/Props/Plant_2.png', width: 15, height: 11, type: 'prop' },
    { id: 'prop-Sack_3', path: 'assets/fantasy/Art/Props/Sack_3.png', width: 16, height: 14, type: 'prop' },
    { id: 'prop-Sign_1', path: 'assets/fantasy/Art/Props/Sign_1.png', width: 24, height: 22, type: 'prop' },
    { id: 'prop-Sign_2', path: 'assets/fantasy/Art/Props/Sign_2.png', width: 24, height: 22, type: 'prop' },
    { id: 'prop-Table_Medium_1', path: 'assets/fantasy/Art/Props/Table_Medium_1.png', width: 42, height: 39, type: 'prop' },

    // TREES & BUSHES
    { id: 'tree-Tree_Emerald_1', path: 'assets/fantasy/Art/Trees and Bushes/Tree_Emerald_1.png', width: 64, height: 63, type: 'tree' },
    { id: 'tree-Tree_Emerald_2', path: 'assets/fantasy/Art/Trees and Bushes/Tree_Emerald_2.png', width: 46, height: 63, type: 'tree' },
    { id: 'tree-Tree_Emerald_3', path: 'assets/fantasy/Art/Trees and Bushes/Tree_Emerald_3.png', width: 52, height: 92, type: 'tree' },
    { id: 'tree-Tree_Emerald_4', path: 'assets/fantasy/Art/Trees and Bushes/Tree_Emerald_4.png', width: 48, height: 93, type: 'tree' },
    { id: 'bush-Bush_Emerald_1', path: 'assets/fantasy/Art/Trees and Bushes/Bush_Emerald_1.png', width: 40, height: 29, type: 'bush' },
    { id: 'bush-Bush_Emerald_2', path: 'assets/fantasy/Art/Trees and Bushes/Bush_Emerald_2.png', width: 48, height: 16, type: 'bush' },
    { id: 'bush-Bush_Emerald_3', path: 'assets/fantasy/Art/Trees and Bushes/Bush_Emerald_3.png', width: 28, height: 28, type: 'bush' },
    { id: 'bush-Bush_Emerald_4', path: 'assets/fantasy/Art/Trees and Bushes/Bush_Emerald_4.png', width: 16, height: 28, type: 'bush' },
    { id: 'bush-Bush_Emerald_5', path: 'assets/fantasy/Art/Trees and Bushes/Bush_Emerald_5.png', width: 14, height: 14, type: 'bush' },
    { id: 'bush-Bush_Emerald_6', path: 'assets/fantasy/Art/Trees and Bushes/Bush_Emerald_6.png', width: 15, height: 10, type: 'bush' },
    { id: 'bush-Bush_Emerald_7', path: 'assets/fantasy/Art/Trees and Bushes/Bush_Emerald_7.png', width: 12, height: 9, type: 'bush' },
];
