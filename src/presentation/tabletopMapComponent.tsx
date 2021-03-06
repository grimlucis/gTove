import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as THREE from 'three';

import {buildEuler, buildVector3} from '../util/threeUtils';
import MapShaderMaterial from '../shaders/mapShaderMaterial';
import HighlightShaderMaterial from '../shaders/highlightShaderMaterial';
import {ObjectEuler, ObjectVector3} from '../util/scenarioUtils';
import {castMapProperties, DriveMetadata, GridType, MapProperties} from '../util/googleDriveUtils';
import TabletopGridComponent from './tabletopGridComponent';

interface TabletopMapComponentProps {
    mapId: string;
    name: string;
    metadata: DriveMetadata<void, MapProperties>;
    snapMap: (mapId: string) => {positionObj: ObjectVector3, rotationObj: ObjectEuler, dx: number, dy: number, width: number, height: number};
    texture: THREE.Texture | null;
    transparentFog: boolean;
    highlight: THREE.Color | null;
    opacity: number;
    fogBitmap?: number[];
}

interface TabletopMapComponentState {
    fogOfWar?: THREE.Texture;
    fogWidth: number;
    fogHeight: number;
}

export default class TabletopMapComponent extends React.Component<TabletopMapComponentProps, TabletopMapComponentState> {

    static propTypes = {
        mapId: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        metadata: PropTypes.object.isRequired,
        snapMap: PropTypes.func.isRequired,
        texture: PropTypes.object,
        transparentFog: PropTypes.bool.isRequired,
        highlight: PropTypes.object,
        opacity: PropTypes.number.isRequired,
        fogBitmap: PropTypes.arrayOf(PropTypes.number)
    };

    static MAP_OFFSET = new THREE.Vector3(0, -0.01, 0);

    constructor(props: TabletopMapComponentProps) {
        super(props);
        this.state = {
            fogOfWar: undefined,
            fogWidth: 0,
            fogHeight: 0
        }
    }

    UNSAFE_componentWillMount() {
        this.updateStateFromProps();
    }

    UNSAFE_componentWillReceiveProps(props: TabletopMapComponentProps) {
        this.updateStateFromProps(props);
    }

    updateStateFromProps(props: TabletopMapComponentProps = this.props) {
        if (props.metadata.properties) {
            const {fogWidth, fogHeight, gridType} = castMapProperties(props.metadata.properties);
            this.setState({fogWidth, fogHeight}, () => {
                if (gridType !== GridType.SQUARE) {
                    this.setState({fogOfWar: undefined});
                } else {
                    let fogOfWar;
                    if (!this.state.fogOfWar || this.state.fogOfWar.image.width !== this.state.fogWidth || this.state.fogOfWar.image.height !== this.state.fogHeight) {
                        fogOfWar = new THREE.Texture(new ImageData(this.state.fogWidth, this.state.fogHeight) as any);
                        fogOfWar.generateMipmaps = false;
                        fogOfWar.minFilter = THREE.LinearFilter;
                    }
                    if (fogOfWar) {
                        this.setState({fogOfWar}, () => {
                            this.updateFogOfWarTexture(props);
                        });
                    } else {
                        this.updateFogOfWarTexture(props);
                    }
                }
            });
        }
    }

    updateFogOfWarTexture(props: TabletopMapComponentProps) {
        const texture = this.state.fogOfWar;
        if (texture) {
            const numTiles = texture.image.height * texture.image.width;
            for (let index = 0, offset = 3; index < numTiles; index++, offset += 4) {
                const cover = (!props.fogBitmap || ((index >> 5) < props.fogBitmap.length && ((props.fogBitmap[index >> 5] || 0) & (1 << (index & 0x1f))) !== 0)) ? 255 : 0;
                const data: Uint8ClampedArray = texture.image['data'] as Uint8ClampedArray;
                if (data[offset] !== cover) {
                    data.set([cover], offset);
                    texture.needsUpdate = true;
                }
            }
        }
    }

    renderMap() {
        const {positionObj, rotationObj, dx, dy, width, height} = this.props.snapMap(this.props.mapId);
        const position = buildVector3(positionObj);
        const rotation = buildEuler(rotationObj);
        const highlightScale = (!this.props.highlight) ? undefined : (
            new THREE.Vector3((width + 0.4) / width, 1.2, (height + 0.4) / height)
        );
        const {showGrid, gridType, gridColour} = castMapProperties(this.props.metadata.properties);
        return (
            <group position={position} rotation={rotation} userData={{mapId: this.props.mapId}}>
                {
                    gridType === GridType.NONE || !showGrid ? null : (
                        <TabletopGridComponent width={width} height={height} dx={dx} dy={dy} gridType={gridType} colour={gridColour || '#000000'} />
                    )
                }
                <mesh position={TabletopMapComponent.MAP_OFFSET}>
                    <boxGeometry attach='geometry' args={[width, 0.005, height]}/>
                    <MapShaderMaterial texture={this.props.texture} opacity={this.props.opacity}
                                       mapWidth={width} mapHeight={height} transparentFog={this.props.transparentFog}
                                       fogOfWar={this.state.fogOfWar} dx={dx} dy={dy}/>
                </mesh>
                {
                    (this.props.highlight) ? (
                        <mesh scale={highlightScale}>
                            <boxGeometry attach='geometry' args={[width, 0.01, height]}/>
                            <HighlightShaderMaterial colour={this.props.highlight} intensityFactor={0.7} />
                        </mesh>
                    ) : null
                }
            </group>
        );
    }

    render() {
        return (this.props.metadata && this.props.metadata.properties) ? this.renderMap() : null;
    }
}