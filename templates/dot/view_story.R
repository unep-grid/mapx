
#
# Top buttons
#
topButtons <-  tags$div(
  class="mx-controls-top mx-controls-story",
  tags$ul(
    class="mx-controls-ul",
    tags$li(
      class="btn fa fa-times",
      `data-story-action`="close"
      ),
    tags$li(
      class="btn fa fa-hand-paper-o",
      `data-story-action`="interact"
      )
    )
  )
#
# Story head
#
topHead <- div(
    class="mx-story-head"
    )

#
# Story steps slides
#
steps <- tagList(
  "{{~path(it,\\u0027data.story.steps\\u0027) :step:index}}",
  tags$div(
    class="mx-story-group",
    `data-story-step-num`="{{=index}}",
    "{{~step.slides :slide}}",
    "{{ var bgCol = mgl.helper.hex2rgba( slide.config.color_bg, slide.config.opacity_bg ) ; }}",
    "{{ var tS =  slide.config.speed_ratio * -0.1334 + 1.665 ;  }}",
    "{{ var tZ =  tS * -300  + 300 ; }}",
    tags$div(
      class="mx-story-layer",
      style="z-index:{{=slide.config.position_z_index }}; transform: translateZ({{=tZ}}px) scale({{=tS}});",
      div(
        class="mx-story-content",
        div(
          class="mx-story-text {{=slide.config.position_x_class}}",
          style="color:{{=slide.config.color_fg }}; background-color:{{=bgCol }} ; ",
          tagList(
            "{{ var lang = mx.util.checkLanguage({obj:slide,path:'html'}) ; }}",
            "{{=slide.html[lang] }}"
            )
          )
        )
      ),
    "{{~}}"
    ),
  "{{~}}"
  )

#
# Full story container
#
out = tagList(
  div(
    class="mx-story-top",
    topButtons,
    topHead
    ),
  div(
    class="mx-story-body",
    steps
    ),
  div(
    class="mx-story-foot"
    )
  )


