import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as THREE from 'three';

interface LabelSpriteProps {
    label: string;
    labelSize: number;
    position: THREE.Vector3;
    rotation?: THREE.Euler;
    inverseScale?: THREE.Vector3;
    maxWidth?: number;
}

interface LabelSpriteState {
    labelWidth: number;
    numLines: number;
}

export default class LabelSprite extends React.Component<LabelSpriteProps, LabelSpriteState> {

    static LABEL_PX_HEIGHT = 48;

    static propTypes = {
        label: PropTypes.string.isRequired,
        labelSize: PropTypes.number.isRequired,
        position: PropTypes.object,
        rotation: PropTypes.object,
        inverseScale: PropTypes.object
    };

    private labelSpriteMaterial: THREE.SpriteMaterial;
    private label: string;
    private labelLines: string[];
    private canvas: HTMLCanvasElement;

    constructor(props: LabelSpriteProps) {
        super(props);
        this.updateLabelSpriteMaterial = this.updateLabelSpriteMaterial.bind(this);
        this.state = {
            labelWidth: 0,
            numLines: 0
        }
    }

    UNSAFE_componentWillReceiveProps(props: LabelSpriteProps) {
        this.updateLabel(props.label);
    }

    private setLabelContext(context: CanvasRenderingContext2D) {
        context.font = `bold ${LabelSprite.LABEL_PX_HEIGHT}px arial, sans-serif`;
        context.fillStyle = 'rgba(255,255,255,1)';
        context.shadowBlur = 4;
        context.shadowColor = 'rgba(0,0,0,1)';
        context.lineWidth = 2;
        context.textBaseline = 'bottom';
        context.textAlign = 'center';
    }

    private getLines(context: CanvasRenderingContext2D, text: string, maxWidth?: number): string[] {
        if (maxWidth === undefined) {
            return [text];
        }
        let words = text.split(" ");
        let lines = [];
        let currentLine = words[0];

        for (let index = 1; index < words.length; index++) {
            let word = words[index];
            const width = context.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    private updateLabel(label: string) {
        if (this.labelSpriteMaterial && label !== this.label) {
            if (!this.canvas) {
                this.canvas = document.createElement('canvas');
            }
            const context = this.canvas.getContext('2d');
            if (context) {
                this.label = label;
                this.setLabelContext(context);
                this.labelLines = this.getLines(context, label, this.props.maxWidth);
                const textWidth = context.measureText(label).width;
                const labelWidth = Math.max(10, this.props.maxWidth ? Math.min(this.props.maxWidth, textWidth) : textWidth);
                this.canvas.width = THREE.MathUtils.ceilPowerOfTwo(labelWidth);
                const labelHeight = LabelSprite.LABEL_PX_HEIGHT * this.labelLines.length;
                this.canvas.height = THREE.MathUtils.ceilPowerOfTwo(labelHeight);
                const labelOffset = this.canvas.height - labelHeight;
                // Unfortunately, setting the canvas width appears to clear the context.
                this.setLabelContext(context);
                this.labelLines.forEach((line, index) => {
                    context.fillText(line, labelWidth / 2, labelOffset + (index + 1) * LabelSprite.LABEL_PX_HEIGHT);
                });
                const texture = new THREE.Texture(this.canvas);
                texture.repeat.set(labelWidth / this.canvas.width, labelHeight / this.canvas.height);
                texture.needsUpdate = true;
                this.labelSpriteMaterial.map = texture;
                this.setState({labelWidth, numLines: this.labelLines.length});
            }
        }
    }

    private updateLabelSpriteMaterial(material: THREE.SpriteMaterial) {
        if (material && material !== this.labelSpriteMaterial) {
            this.labelSpriteMaterial = material;
            this.label = this.props.label + ' changed';
            this.updateLabel(this.props.label);
        }
    }

    render() {
        const pxToWorld = this.props.labelSize / LabelSprite.LABEL_PX_HEIGHT;
        const scaleX = (this.props.inverseScale) ? this.props.inverseScale.x : 1;
        const scaleY = (this.props.inverseScale) ? this.props.inverseScale.y : 1;
        const scale = this.state.labelWidth ? new THREE.Vector3(this.state.labelWidth * pxToWorld / scaleX, this.state.numLines * this.props.labelSize / scaleY, 1) : undefined;
        const position = this.props.position.clone();
        position.y += this.state.numLines * this.props.labelSize / 2;
        return (
            <sprite position={position} scale={scale}>
                <spriteMaterial attach='material' ref={this.updateLabelSpriteMaterial}/>
            </sprite>
        );
    }
}